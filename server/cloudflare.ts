interface CloudflareZoneResponse {
  result: {
    id: string;
    name: string;
  };
  success: boolean;
  errors: Array<{ message: string }>;
}

interface CloudflareDnsRecord {
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

interface CloudflareDnsResponse {
  result: {
    id: string;
    name: string;
    type: string;
    content: string;
    proxied: boolean;
  };
  success: boolean;
  errors: Array<{ message: string }>;
}

export class CloudflareService {
  private apiToken: string;
  private zoneId: string;

  constructor(apiToken: string, zoneId: string) {
    this.apiToken = apiToken;
    this.zoneId = zoneId;
  }

  private async makeRequest(endpoint: string, method: string = "GET", body?: any) {
    const url = `https://api.cloudflare.com/client/v4${endpoint}`;
    const headers = {
      "Authorization": `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return await response.json();
  }

  async verifyCredentials(): Promise<{ valid: boolean; zoneName?: string; message: string }> {
    try {
      const response: CloudflareZoneResponse = await this.makeRequest(`/zones/${this.zoneId}`);
      
      if (response.success && response.result) {
        return {
          valid: true,
          zoneName: response.result.name,
          message: `Successfully connected to zone: ${response.result.name}`,
        };
      }

      return {
        valid: false,
        message: response.errors?.[0]?.message || "Invalid credentials or zone ID",
      };
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : "Failed to verify credentials",
      };
    }
  }

  async createDnsRecord(
    name: string,
    content: string,
    type: string = "A",
    proxied: boolean = true
  ): Promise<{ success: boolean; recordId?: string; message: string }> {
    try {
      const record: CloudflareDnsRecord = {
        type,
        name,
        content,
        proxied,
        ttl: proxied ? 1 : 3600,
      };

      const response: CloudflareDnsResponse = await this.makeRequest(
        `/zones/${this.zoneId}/dns_records`,
        "POST",
        record
      );

      if (response.success && response.result) {
        return {
          success: true,
          recordId: response.result.id,
          message: `DNS record created: ${response.result.name} → ${response.result.content}`,
        };
      }

      return {
        success: false,
        message: response.errors?.[0]?.message || "Failed to create DNS record",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create DNS record",
      };
    }
  }

  async updateDnsRecordProxy(
    recordId: string,
    proxied: boolean
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response: CloudflareDnsResponse = await this.makeRequest(
        `/zones/${this.zoneId}/dns_records/${recordId}`,
        "PATCH",
        { proxied }
      );

      if (response.success) {
        return {
          success: true,
          message: `Proxy mode ${proxied ? "enabled" : "disabled"} for DNS record`,
        };
      }

      return {
        success: false,
        message: response.errors?.[0]?.message || "Failed to update proxy setting",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update proxy setting",
      };
    }
  }

  async deleteDnsRecord(recordId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest(
        `/zones/${this.zoneId}/dns_records/${recordId}`,
        "DELETE"
      );

      if (response.success) {
        return {
          success: true,
          message: "DNS record deleted successfully",
        };
      }

      return {
        success: false,
        message: response.errors?.[0]?.message || "Failed to delete DNS record",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete DNS record",
      };
    }
  }
}
