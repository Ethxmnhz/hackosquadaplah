import axios from 'axios';

// Interface definitions
export interface Vulnerability {
  id: string;
  cve_id: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  published_date: string;
  last_modified_date: string;
  references: string[];
  cvss_score?: number;
  cvss_vector?: string;
  cwe_id?: string;
  affected_products?: string[];
}

export interface ThreatFeed {
  id: string;
  title: string;
  description: string;
  source: string;
  published_date: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'vulnerability' | 'malware' | 'phishing' | 'ransomware' | 'data-breach' | 'other';
  tags: string[];
  url?: string;
}

// NIST NVD API with API Key from environment
export const fetchNVDVulnerabilities = async (params?: {
  cveId?: string;
  keyword?: string;
  pubStartDate?: string;
  pubEndDate?: string;
  resultsPerPage?: number;
  startIndex?: number;
}): Promise<Vulnerability[]> => {
  try {
    // Get API key from environment variables
    const apiKey = import.meta.env.VITE_NVD_API_KEY;
    
    if (!apiKey || apiKey === 'your-nvd-api-key-here') {
      console.warn('NVD API key not configured, using mock data');
      return generateMockVulnerabilities();
    }
    
    // Build the NVD API URL with parameters - use direct HTTPS URL
    let nvdApiUrl = 'https://services.nvd.nist.gov/rest/json/cves/2.0?';
    
    if (params?.cveId) {
      nvdApiUrl += `cveId=${params.cveId}&`;
    }
    
    if (params?.keyword) {
      nvdApiUrl += `keywordSearch=${encodeURIComponent(params.keyword)}&`;
    }
    
    if (params?.pubStartDate) {
      nvdApiUrl += `pubStartDate=${params.pubStartDate}&`;
    }
    
    if (params?.pubEndDate) {
      nvdApiUrl += `pubEndDate=${params.pubEndDate}&`;
    }
    
    if (params?.startIndex) {
      nvdApiUrl += `startIndex=${params.startIndex}&`;
    }
    
    nvdApiUrl += `resultsPerPage=${params?.resultsPerPage || 50}`;
    
    const response = await axios.get(nvdApiUrl, {
      headers: {
        'apiKey': apiKey
      }
    });
    
    if (response.data && response.data.vulnerabilities) {
      return response.data.vulnerabilities.map((item: any, index: number) => {
        const cve = item.cve;
        
        // Extract CVSS score and vector
        let cvssScore;
        let cvssVector;
        if (cve.metrics && cve.metrics.cvssMetricV31) {
          const cvssData = cve.metrics.cvssMetricV31[0];
          cvssScore = cvssData.cvssData.baseScore;
          cvssVector = cvssData.cvssData.vectorString;
        } else if (cve.metrics && cve.metrics.cvssMetricV30) {
          const cvssData = cve.metrics.cvssMetricV30[0];
          cvssScore = cvssData.cvssData.baseScore;
          cvssVector = cvssData.cvssData.vectorString;
        } else if (cve.metrics && cve.metrics.cvssMetricV2) {
          const cvssData = cve.metrics.cvssMetricV2[0];
          cvssScore = cvssData.cvssData.baseScore;
          cvssVector = cvssData.cvssData.vectorString;
        }
        
        // Determine severity based on CVSS score
        let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' = 'UNKNOWN';
        if (cvssScore !== undefined) {
          if (cvssScore >= 9.0) severity = 'CRITICAL';
          else if (cvssScore >= 7.0) severity = 'HIGH';
          else if (cvssScore >= 4.0) severity = 'MEDIUM';
          else severity = 'LOW';
        }
        
        // Extract CWE ID if available
        const cweId = cve.weaknesses && cve.weaknesses.length > 0 && cve.weaknesses[0].description
          ? cve.weaknesses[0].description[0].value
          : undefined;
        
        // Extract affected products
        const affectedProducts = cve.configurations && cve.configurations.length > 0
          ? cve.configurations.flatMap((config: any) => 
              config.nodes.flatMap((node: any) => 
                node.cpeMatch.map((cpe: any) => {
                  const parts = cpe.criteria.split(':');
                  return parts.length >= 5 ? `${parts[3]} ${parts[4]}` : cpe.criteria;
                })
              )
            )
          : [];
        
        return {
          id: `vuln-${cve.id}-${index}`,
          cve_id: cve.id,
          description: cve.descriptions[0].value,
          severity,
          published_date: cve.published,
          last_modified_date: cve.lastModified,
          references: cve.references.map((ref: any) => ref.url),
          cvss_score: cvssScore,
          cvss_vector: cvssVector,
          cwe_id: cweId,
          affected_products: [...new Set(affectedProducts)].slice(0, 5) // Deduplicate and limit to 5
        };
      });
    }
    
    throw new Error('Failed to parse NVD API response');
  } catch (error) {
    console.error('Error fetching NVD vulnerabilities:', error);
    // Fallback to mock data if API fails
    return generateMockVulnerabilities();
  }
};

// Generate mock vulnerability data for development/fallback
const generateMockVulnerabilities = (): Vulnerability[] => {
  const mockVulns: Vulnerability[] = [
    {
      id: 'vuln-mock-1',
      cve_id: 'CVE-2024-0001',
      description: 'A critical remote code execution vulnerability in web application framework allowing attackers to execute arbitrary code.',
      severity: 'CRITICAL',
      published_date: new Date(Date.now() - 86400000).toISOString(),
      last_modified_date: new Date().toISOString(),
      references: ['https://example.com/advisory-1'],
      cvss_score: 9.8,
      cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      cwe_id: 'CWE-78',
      affected_products: ['Apache HTTP Server', 'Nginx']
    },
    {
      id: 'vuln-mock-2',
      cve_id: 'CVE-2024-0002',
      description: 'SQL injection vulnerability in database management system allowing unauthorized data access.',
      severity: 'HIGH',
      published_date: new Date(Date.now() - 172800000).toISOString(),
      last_modified_date: new Date().toISOString(),
      references: ['https://example.com/advisory-2'],
      cvss_score: 8.1,
      cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
      cwe_id: 'CWE-89',
      affected_products: ['MySQL', 'PostgreSQL']
    },
    {
      id: 'vuln-mock-3',
      cve_id: 'CVE-2024-0003',
      description: 'Cross-site scripting vulnerability in web application allowing malicious script execution.',
      severity: 'MEDIUM',
      published_date: new Date(Date.now() - 259200000).toISOString(),
      last_modified_date: new Date().toISOString(),
      references: ['https://example.com/advisory-3'],
      cvss_score: 6.1,
      cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N',
      cwe_id: 'CWE-79',
      affected_products: ['WordPress', 'Drupal']
    },
    {
      id: 'vuln-mock-4',
      cve_id: 'CVE-2024-0004',
      description: 'Privilege escalation vulnerability in operating system kernel allowing local users to gain root access.',
      severity: 'HIGH',
      published_date: new Date(Date.now() - 345600000).toISOString(),
      last_modified_date: new Date().toISOString(),
      references: ['https://example.com/advisory-4'],
      cvss_score: 7.8,
      cvss_vector: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H',
      cwe_id: 'CWE-269',
      affected_products: ['Linux Kernel', 'Ubuntu']
    },
    {
      id: 'vuln-mock-5',
      cve_id: 'CVE-2024-0005',
      description: 'Buffer overflow vulnerability in network service allowing denial of service attacks.',
      severity: 'MEDIUM',
      published_date: new Date(Date.now() - 432000000).toISOString(),
      last_modified_date: new Date().toISOString(),
      references: ['https://example.com/advisory-5'],
      cvss_score: 5.3,
      cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L',
      cwe_id: 'CWE-120',
      affected_products: ['OpenSSL', 'Apache HTTP Server']
    }
  ];
  
  return mockVulns;
};

// Fetch recent vulnerabilities for the last 7 days
export const fetchRecentVulnerabilities = async (): Promise<Vulnerability[]> => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Format dates for NVD API (YYYY-MM-DDT00:00:00.000)
    const pubStartDate = sevenDaysAgo.toISOString().split('T')[0] + 'T00:00:00.000';
    
    return await fetchNVDVulnerabilities({
      pubStartDate,
      resultsPerPage: 100
    });
  } catch (error) {
    console.error('Error fetching recent vulnerabilities:', error);
    // Return filtered mock data for recent vulnerabilities
    const mockVulns = generateMockVulnerabilities();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return mockVulns.filter(vuln => new Date(vuln.published_date) >= sevenDaysAgo);
  }
};

// Fetch critical vulnerabilities
export const fetchCriticalVulnerabilities = async (): Promise<Vulnerability[]> => {
  try {
    // First get a larger set of vulnerabilities
    const allVulns = await fetchNVDVulnerabilities({
      resultsPerPage: 100
    });
    
    // Filter for critical only
    return allVulns.filter(vuln => vuln.severity === 'CRITICAL');
  } catch (error) {
    console.error('Error fetching critical vulnerabilities:', error);
    // Return filtered mock data for critical vulnerabilities
    const mockVulns = generateMockVulnerabilities();
    return mockVulns.filter(vuln => vuln.severity === 'CRITICAL');
  }
};

// Fetch threat feeds from various sources
export const fetchThreatFeeds = async (): Promise<ThreatFeed[]> => {
  try {
    // Get recent vulnerabilities from NVD to transform into threat feeds
    const vulnerabilities = await fetchNVDVulnerabilities({
      resultsPerPage: 50
    });
    
    // Transform vulnerabilities into threat feeds
    return vulnerabilities.map((vuln, index) => {
      // Determine category based on description keywords
      let category: 'vulnerability' | 'malware' | 'phishing' | 'ransomware' | 'data-breach' | 'other' = 'vulnerability';
      
      if (vuln.description.toLowerCase().includes('malware') || 
          vuln.description.toLowerCase().includes('virus') ||
          vuln.description.toLowerCase().includes('trojan')) {
        category = 'malware';
      } else if (vuln.description.toLowerCase().includes('phishing') ||
                vuln.description.toLowerCase().includes('social engineering')) {
        category = 'phishing';
      } else if (vuln.description.toLowerCase().includes('ransomware') ||
                vuln.description.toLowerCase().includes('ransom')) {
        category = 'ransomware';
      } else if (vuln.description.toLowerCase().includes('data breach') ||
                vuln.description.toLowerCase().includes('information disclosure')) {
        category = 'data-breach';
      }
      
      // Generate tags from description and affected products
      const descriptionWords = vuln.description.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(' ')
        .filter(word => word.length > 4)
        .slice(0, 3);
      
      const tags = [
        ...new Set([
          ...descriptionWords,
          ...(vuln.affected_products || []).map(p => p.toLowerCase().split(' ')[0])
        ])
      ].slice(0, 5);
      
      // Map severity
      const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
        'CRITICAL': 'critical',
        'HIGH': 'high',
        'MEDIUM': 'medium',
        'LOW': 'low',
        'UNKNOWN': 'info'
      };
      
      // Create a more descriptive title based on the vulnerability
      let title = `Security Alert: ${vuln.cve_id}`;
      
      if (category === 'malware') {
        title = `Malware Alert: ${vuln.cve_id} - Potential Malicious Code Execution`;
      } else if (category === 'phishing') {
        title = `Phishing Campaign: ${vuln.cve_id} - Social Engineering Attack`;
      } else if (category === 'ransomware') {
        title = `Ransomware Threat: ${vuln.cve_id} - Data Encryption Risk`;
      } else if (category === 'data-breach') {
        title = `Data Breach: ${vuln.cve_id} - Information Disclosure`;
      } else if (vuln.description.toLowerCase().includes('remote code execution')) {
        title = `RCE Vulnerability: ${vuln.cve_id} - Remote Code Execution`;
      } else if (vuln.description.toLowerCase().includes('denial of service')) {
        title = `DoS Vulnerability: ${vuln.cve_id} - Service Disruption`;
      } else if (vuln.description.toLowerCase().includes('privilege escalation')) {
        title = `Privilege Escalation: ${vuln.cve_id} - Elevated Access`;
      }
      
      return {
        id: `threat-${vuln.cve_id}-${index}`,
        title: title,
        description: vuln.description,
        source: 'NIST NVD',
        published_date: vuln.published_date,
        severity: severityMap[vuln.severity],
        category,
        tags,
        url: `https://nvd.nist.gov/vuln/detail/${vuln.cve_id}`
      };
    });
  } catch (error) {
    console.error('Error fetching threat feeds:', error);
    // Return mock threat feeds
    return generateMockThreatFeeds();
  }
};

// Generate mock threat feeds for development/fallback
const generateMockThreatFeeds = (): ThreatFeed[] => {
  return [
    {
      id: 'threat-mock-1',
      title: 'RCE Vulnerability: CVE-2024-0001 - Remote Code Execution',
      description: 'A critical remote code execution vulnerability in web application framework allowing attackers to execute arbitrary code.',
      source: 'NIST NVD',
      published_date: new Date(Date.now() - 86400000).toISOString(),
      severity: 'critical',
      category: 'vulnerability',
      tags: ['remote', 'execution', 'critical', 'apache', 'nginx'],
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-0001'
    },
    {
      id: 'threat-mock-2',
      title: 'Security Alert: CVE-2024-0002',
      description: 'SQL injection vulnerability in database management system allowing unauthorized data access.',
      source: 'NIST NVD',
      published_date: new Date(Date.now() - 172800000).toISOString(),
      severity: 'high',
      category: 'vulnerability',
      tags: ['injection', 'database', 'unauthorized', 'mysql', 'postgresql'],
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-0002'
    },
    {
      id: 'threat-mock-3',
      title: 'Security Alert: CVE-2024-0003',
      description: 'Cross-site scripting vulnerability in web application allowing malicious script execution.',
      source: 'NIST NVD',
      published_date: new Date(Date.now() - 259200000).toISOString(),
      severity: 'medium',
      category: 'vulnerability',
      tags: ['cross-site', 'scripting', 'malicious', 'wordpress', 'drupal'],
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-0003'
    }
  ];
};

// Get comprehensive threat intelligence data
export const fetchComprehensiveThreatIntelligence = async () => {
  try {
    // Fetch multiple data sets in parallel
    const [allVulnerabilities, recentVulnerabilities, criticalVulnerabilities, threatFeeds] = await Promise.all([
      fetchNVDVulnerabilities({ resultsPerPage: 50 }),
      fetchRecentVulnerabilities(),
      fetchCriticalVulnerabilities(),
      fetchThreatFeeds()
    ]);
    
    return {
      allVulnerabilities,
      recentVulnerabilities,
      criticalVulnerabilities,
      threatFeeds
    };
  } catch (error) {
    console.error('Error fetching comprehensive threat intelligence:', error);
    throw error;
  }
};