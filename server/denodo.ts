import type { DrugIndexEntry, DrugLabel } from "@shared/schema";

interface DenodoConfig {
  baseUrl: string;
  username: string;
  password: string;
  database: string;
}

interface DenodoRow {
  [key: string]: any;
}

interface DenodoResponse {
  name: string;
  elements: DenodoRow[];
}

export class DenodoClient {
  private config: DenodoConfig;
  private authHeader: string;

  constructor(config: DenodoConfig) {
    this.config = config;
    // Create Basic Auth header
    const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  /**
   * Execute a VQL query against Denodo
   */
  private async executeQuery(viewName: string, filter?: string): Promise<DenodoRow[]> {
    // Construct REST API URL
    // Format: {baseUrl}/{database}/views/{viewName}/rows
    let url = `${this.config.baseUrl}/${this.config.database}/views/${viewName}`;
    
    if (filter) {
      url += `?$filter=${encodeURIComponent(filter)}`;
    }

    console.log(`[Denodo] Querying: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Denodo API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as DenodoResponse;
      console.log(`[Denodo] Retrieved ${data.elements?.length || 0} rows from ${viewName}`);
      
      return data.elements || [];
    } catch (error) {
      console.error('[Denodo] Query failed:', error);
      throw error;
    }
  }

  /**
   * Get list of all drugs from Denodo
   * Assumes a view named 'product_and_label_index' or similar exists
   */
  async getDrugIndex(viewName: string = 'product_and_label_index'): Promise<DrugIndexEntry[]> {
    try {
      const rows = await this.executeQuery(viewName);
      
      // Map Denodo rows to DrugIndexEntry format
      // Adjust field names based on your actual Denodo schema
      return rows.map((row, index) => ({
        labelId: row.label_id || row.labelId || `drug-${String(index + 1).padStart(3, '0')}`,
        drugName: row.drug_name || row.drugName || row.name || 'Unknown Drug',
        snapshotDate: row.snapshot_date || row.snapshotDate || new Date().toISOString().split('T')[0],
        logoPath: row.logo_path || row.logoPath || '/drug-logos/default.svg',
      }));
    } catch (error) {
      console.error('[Denodo] Error fetching drug index:', error);
      throw error;
    }
  }

  /**
   * Get a single drug label by labelId
   */
  async getDrugLabel(labelId: string, viewName: string = 'product_and_label_index'): Promise<DrugLabel> {
    try {
      // Query with filter for specific labelId
      const filter = `label_id eq '${labelId}'`;
      const rows = await this.executeQuery(viewName, filter);
      
      if (rows.length === 0) {
        throw new Error(`Drug with labelId ${labelId} not found in Denodo`);
      }

      const row = rows[0];
      
      // Map Denodo row to DrugLabel format
      // Adjust field names based on your actual Denodo schema
      return {
        labelId: row.label_id || row.labelId || labelId,
        drugName: row.drug_name || row.drugName || row.name || 'Unknown Drug',
        snapshotDate: row.snapshot_date || row.snapshotDate || new Date().toISOString().split('T')[0],
        labelText: row.label_text || row.labelText || row.prescribing_information || '',
      };
    } catch (error) {
      console.error(`[Denodo] Error fetching label ${labelId}:`, error);
      throw error;
    }
  }

  /**
   * Test connection to Denodo
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}/${this.config.database}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        console.log('[Denodo] Connection test successful');
        return true;
      } else {
        console.error(`[Denodo] Connection test failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('[Denodo] Connection test error:', error);
      return false;
    }
  }
}

/**
 * Create Denodo client if credentials are available
 */
export function createDenodoClient(): DenodoClient | null {
  const baseUrl = process.env.DENODO_BASE_URL;
  const username = process.env.DENODO_USERNAME;
  const password = process.env.DENODO_PASSWORD;
  const database = process.env.DENODO_DATABASE;

  if (!baseUrl || !username || !password || !database) {
    console.log('[Denodo] Credentials not configured, using local files');
    return null;
  }

  console.log('[Denodo] Initializing client with:', {
    baseUrl,
    username,
    database,
  });

  return new DenodoClient({
    baseUrl,
    username,
    password,
    database,
  });
}
