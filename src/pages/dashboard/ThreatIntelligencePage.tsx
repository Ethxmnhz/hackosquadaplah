import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, AlertTriangle, ExternalLink, Search, 
  Filter, RefreshCw, Calendar, Clock, Zap, 
  Globe, Server, Database, Lock, FileText, 
  ChevronDown, ChevronUp, Copy, Link, Info,
  Mail, CheckCircle, X, Download, FileJson
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import Card from '../../components/ui/Card';
import { 
  fetchNVDVulnerabilities, 
  fetchThreatFeeds, 
  fetchRecentVulnerabilities,
  fetchCriticalVulnerabilities,
  fetchComprehensiveThreatIntelligence,
  Vulnerability,
  ThreatFeed
} from '../../lib/api/threatIntelligence';

const ThreatIntelligencePage = () => {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [threatFeeds, setThreatFeeds] = useState<ThreatFeed[]>([]);
  const [recentVulnerabilities, setRecentVulnerabilities] = useState<Vulnerability[]>([]);
  const [criticalVulnerabilities, setCriticalVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'vulnerabilities' | 'threats'>('vulnerabilities');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'success' | 'partial' | 'failed'>('success');
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  useEffect(() => {
    loadThreatIntelligence();
  }, []);

  const loadThreatIntelligence = async () => {
    setLoading(true);
    setError(null);
    setLoadingProgress(0);
    
    try {
      // Fetch comprehensive threat intelligence data
      const data = await fetchComprehensiveThreatIntelligence();
      
      setVulnerabilities(data.allVulnerabilities);
      setLoadingProgress(25);
      
      setRecentVulnerabilities(data.recentVulnerabilities);
      setLoadingProgress(50);
      
      setCriticalVulnerabilities(data.criticalVulnerabilities);
      setLoadingProgress(75);
      
      setThreatFeeds(data.threatFeeds);
      setLoadingProgress(100);
      
      setApiStatus('success');
    } catch (error) {
      console.error('Error loading threat intelligence:', error);
      setError('Failed to load complete threat intelligence data. Some data may be unavailable.');
      
      // Try to fetch individual data sets to get partial data
      try {
        await fetchPartialData();
        setApiStatus('partial');
      } catch (secondError) {
        console.error('Error fetching partial data:', secondError);
        setApiStatus('failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPartialData = async () => {
    try {
      // Try to fetch vulnerabilities
      const vulns = await fetchNVDVulnerabilities({
        resultsPerPage: 50
      });
      setVulnerabilities(vulns);
      
      // Try to get critical vulnerabilities from the fetched data
      const critical = vulns.filter(v => v.severity === 'CRITICAL');
      setCriticalVulnerabilities(critical);
      
      // Try to get recent vulnerabilities from the fetched data
      const now = new Date();
      const recent = vulns.filter(v => {
        const publishDate = new Date(v.published_date);
        const daysDiff = Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff < 7;
      });
      setRecentVulnerabilities(recent);
      
      // Generate threat feeds from vulnerabilities
      const threats = vulns.slice(0, 20).map((vuln, index) => {
        // Determine category based on description keywords
        let category: 'vulnerability' | 'malware' | 'phishing' | 'ransomware' | 'data-breach' | 'other' = 'vulnerability';
        
        if (vuln.description.toLowerCase().includes('malware') || 
            vuln.description.toLowerCase().includes('virus')) {
          category = 'malware';
        } else if (vuln.description.toLowerCase().includes('phishing')) {
          category = 'phishing';
        } else if (vuln.description.toLowerCase().includes('ransomware')) {
          category = 'ransomware';
        } else if (vuln.description.toLowerCase().includes('data breach')) {
          category = 'data-breach';
        }
        
        // Generate tags from description
        const tags = vuln.description.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(' ')
          .filter(word => word.length > 4)
          .slice(0, 5);
        
        // Map severity
        const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
          'CRITICAL': 'critical',
          'HIGH': 'high',
          'MEDIUM': 'medium',
          'LOW': 'low',
          'UNKNOWN': 'info'
        };
        
        return {
          id: `threat-${index}`,
          title: `Security Alert: ${vuln.cve_id}`,
          description: vuln.description,
          source: 'NIST NVD',
          published_date: vuln.published_date,
          severity: severityMap[vuln.severity],
          category,
          tags,
          url: `https://nvd.nist.gov/vuln/detail/${vuln.cve_id}`
        };
      });
      
      setThreatFeeds(threats);
    } catch (error) {
      console.error('Error in fetchPartialData:', error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadThreatIntelligence();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleItemExpanded = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getSeverityColor = (severity: string) => {
    const severityLower = severity.toLowerCase();
    switch (severityLower) {
      case 'critical':
        return 'bg-error-dark/20 text-error-light border-error-light/30';
      case 'high':
        return 'bg-warning-dark/20 text-warning-light border-warning-light/30';
      case 'medium':
        return 'bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30';
      case 'low':
        return 'bg-accent-blue/20 text-accent-blue border-accent-blue/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vulnerability':
        return <Shield className="h-5 w-5" />;
      case 'malware':
        return <Server className="h-5 w-5" />;
      case 'phishing':
        return <Mail className="h-5 w-5" />;
      case 'ransomware':
        return <Lock className="h-5 w-5" />;
      case 'data-breach':
        return <Database className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  // Filter vulnerabilities based on search and filters
  const filteredVulnerabilities = vulnerabilities.filter(vuln => {
    const matchesSearch = 
      vuln.cve_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === 'all' || vuln.severity.toLowerCase() === severityFilter.toLowerCase();
    
    const publishDate = new Date(vuln.published_date);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const matchesTime = 
      timeFilter === 'all' || 
      (timeFilter === 'today' && daysDiff < 1) ||
      (timeFilter === 'week' && daysDiff < 7) ||
      (timeFilter === 'month' && daysDiff < 30);
    
    return matchesSearch && matchesSeverity && matchesTime;
  });

  // Filter threat feeds based on search and filters
  const filteredThreats = threatFeeds.filter(threat => {
    const matchesSearch = 
      threat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      threat.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === 'all' || threat.severity === severityFilter;
    
    const matchesCategory = categoryFilter === 'all' || threat.category === categoryFilter;
    
    const publishDate = new Date(threat.published_date);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const matchesTime = 
      timeFilter === 'all' || 
      (timeFilter === 'today' && daysDiff < 1) ||
      (timeFilter === 'week' && daysDiff < 7) ||
      (timeFilter === 'month' && daysDiff < 30);
    
    return matchesSearch && matchesSeverity && matchesCategory && matchesTime;
  });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistance(new Date(dateString), new Date(), { addSuffix: true });
    } catch (error) {
      return 'unknown time ago';
    }
  };

  const downloadData = (data: any, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">Threat Intelligence</h1>
            <p className="text-gray-400 text-lg">Stay informed about the latest cybersecurity threats and vulnerabilities</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 border border-primary/30 bg-primary/5">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-primary mr-3" />
              <div>
                <div className="text-2xl font-bold text-white">{vulnerabilities.length}</div>
                <div className="text-sm text-gray-400">Vulnerabilities</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 border border-error-light/30 bg-error-dark/5">
            <div className="flex items-center">
              <Lock className="h-6 w-6 text-error-light mr-3" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {criticalVulnerabilities.length}
                </div>
                <div className="text-sm text-gray-400">Critical</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-accent-blue/30 bg-accent-blue/5">
            <div className="flex items-center">
              <Globe className="h-6 w-6 text-accent-blue mr-3" />
              <div>
                <div className="text-2xl font-bold text-white">{threatFeeds.length}</div>
                <div className="text-sm text-gray-400">Threat Reports</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-warning-light/30 bg-warning-dark/5">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-warning-light mr-3" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {recentVulnerabilities.length}
                </div>
                <div className="text-sm text-gray-400">Last 7 Days</div>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* API Status */}
      {apiStatus !== 'success' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className={`flex items-center gap-2 p-4 rounded-lg ${
            apiStatus === 'partial' 
              ? 'bg-warning-dark/20 border border-warning-light/30 text-warning-light'
              : 'bg-error-dark/20 border border-error-light/30 text-error-light'
          }`}>
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p>
              {apiStatus === 'partial' 
                ? 'Some threat intelligence sources are unavailable. Showing partial live data.'
                : 'Unable to connect to threat intelligence APIs. Please try again later.'}
            </p>
            <button onClick={() => setApiStatus('success')} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex space-x-8 border-b border-background-light">
          <button
            onClick={() => setActiveTab('vulnerabilities')}
            className={`flex items-center px-4 py-4 border-b-2 font-medium ${
              activeTab === 'vulnerabilities'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            <AlertTriangle className="h-5 w-5 mr-2" />
            Vulnerabilities
          </button>
          <button
            onClick={() => setActiveTab('threats')}
            className={`flex items-center px-4 py-4 border-b-2 font-medium ${
              activeTab === 'threats'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            <Shield className="h-5 w-5 mr-2" />
            Threat Reports
          </button>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8"
      >
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={`Search ${activeTab === 'vulnerabilities' ? 'vulnerabilities' : 'threat reports'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background-light border border-background-default rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              {/* Severity Filter */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="form-input"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {/* Category Filter - only for threats */}
              {activeTab === 'threats' && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="form-input"
                >
                  <option value="all">All Categories</option>
                  <option value="vulnerability">Vulnerabilities</option>
                  <option value="malware">Malware</option>
                  <option value="phishing">Phishing</option>
                  <option value="ransomware">Ransomware</option>
                  <option value="data-breach">Data Breaches</option>
                </select>
              )}

              {/* Time Filter */}
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="form-input"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-outline flex items-center"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>

              {/* Export Button */}
              <button
                onClick={() => downloadData(
                  activeTab === 'vulnerabilities' ? filteredVulnerabilities : filteredThreats,
                  activeTab === 'vulnerabilities' ? 'vulnerabilities.json' : 'threats.json'
                )}
                className="btn-outline flex items-center"
              >
                <Download className="h-5 w-5 mr-2" />
                Export
              </button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Content */}
      {activeTab === 'vulnerabilities' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          {loading ? (
            <Card className="p-6">
              <div className="flex flex-col items-center">
                <div className="animate-pulse text-primary mb-4">Loading vulnerabilities...</div>
                <div className="w-full bg-background-light rounded-full h-2 mb-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <div className="text-sm text-gray-400">{loadingProgress}% complete</div>
              </div>
            </Card>
          ) : error ? (
            <Card className="p-8 text-center">
              <AlertTriangle className="h-16 w-16 text-error-light mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Error Loading Data</h3>
              <p className="text-gray-400 mb-4">{error}</p>
              <button onClick={handleRefresh} className="btn-primary">
                <RefreshCw className="h-5 w-5 mr-2" />
                Try Again
              </button>
            </Card>
          ) : filteredVulnerabilities.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertTriangle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Vulnerabilities Found</h3>
              <p className="text-gray-400">Try adjusting your search criteria or filters</p>
            </Card>
          ) : (
            filteredVulnerabilities.map((vuln) => (
              <Card key={vuln.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(vuln.severity)}`}>
                        {vuln.severity}
                      </span>
                      <span className="text-white font-mono">{vuln.cve_id}</span>
                      <button
                        onClick={() => handleCopyToClipboard(vuln.cve_id, vuln.id)}
                        className="text-gray-400 hover:text-white"
                        title="Copy CVE ID"
                      >
                        {copied === vuln.id ? (
                          <CheckCircle className="h-4 w-4 text-success-light" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-3 line-clamp-2">
                      {vuln.description}
                    </h3>
                    
                    <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Published: {formatDate(vuln.published_date)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {getTimeAgo(vuln.published_date)}
                      </div>
                      {vuln.cvss_score && (
                        <div className="flex items-center">
                          <Zap className="h-4 w-4 mr-1" />
                          CVSS: {vuln.cvss_score.toFixed(1)}
                        </div>
                      )}
                      {vuln.cwe_id && (
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-1" />
                          {vuln.cwe_id}
                        </div>
                      )}
                    </div>
                    
                    {expandedItems[vuln.id] && (
                      <div className="mt-4 space-y-4">
                        {vuln.affected_products && vuln.affected_products.length > 0 && (
                          <div>
                            <h4 className="text-white font-medium mb-2">Affected Products</h4>
                            <div className="flex flex-wrap gap-2">
                              {vuln.affected_products.map((product, index) => (
                                <span key={index} className="px-3 py-1 bg-background-light rounded-full text-sm text-gray-300">
                                  {product}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {vuln.cvss_vector && (
                          <div>
                            <h4 className="text-white font-medium mb-2">CVSS Vector</h4>
                            <div className="bg-background-light p-3 rounded-lg font-mono text-sm text-gray-300">
                              {vuln.cvss_vector}
                            </div>
                          </div>
                        )}
                        
                        {vuln.references && vuln.references.length > 0 && (
                          <div>
                            <h4 className="text-white font-medium mb-2">References</h4>
                            <div className="space-y-2">
                              {vuln.references.map((ref, index) => (
                                <a
                                  key={index}
                                  href={ref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center p-2 bg-background-light rounded-lg text-primary hover:text-primary-light hover:bg-background-light/80 transition-colors"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2 flex-shrink-0" />
                                  <span className="text-sm truncate">{ref}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex md:flex-col gap-2">
                    <a
                      href={`https://nvd.nist.gov/vuln/detail/${vuln.cve_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </a>
                    <button
                      onClick={() => toggleItemExpanded(vuln.id)}
                      className="btn-outline flex items-center"
                    >
                      {expandedItems[vuln.id] ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Show More
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </motion.div>
      )}

      {activeTab === 'threats' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          {loading ? (
            <Card className="p-6">
              <div className="flex flex-col items-center">
                <div className="animate-pulse text-primary mb-4">Loading threat reports...</div>
                <div className="w-full bg-background-light rounded-full h-2 mb-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <div className="text-sm text-gray-400">{loadingProgress}% complete</div>
              </div>
            </Card>
          ) : error ? (
            <Card className="p-8 text-center">
              <Shield className="h-16 w-16 text-error-light mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Error Loading Data</h3>
              <p className="text-gray-400 mb-4">{error}</p>
              <button onClick={handleRefresh} className="btn-primary">
                <RefreshCw className="h-5 w-5 mr-2" />
                Try Again
              </button>
            </Card>
          ) : filteredThreats.length === 0 ? (
            <Card className="p-8 text-center">
              <Shield className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Threat Reports Found</h3>
              <p className="text-gray-400">Try adjusting your search criteria or filters</p>
            </Card>
          ) : (
            filteredThreats.map((threat) => (
              <Card key={threat.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(threat.severity)}`}>
                        {threat.severity.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-background-light text-gray-300 flex items-center">
                        {getCategoryIcon(threat.category)}
                        <span className="ml-1">{threat.category.replace('-', ' ').toUpperCase()}</span>
                      </span>
                      <span className="text-gray-400 text-xs">{threat.source}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-3">
                      {threat.title}
                    </h3>
                    
                    <p className="text-gray-300 mb-4">
                      {threat.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {threat.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="text-sm text-gray-400">
                      <Clock className="h-4 w-4 inline mr-1" />
                      {formatDate(threat.published_date)} ({getTimeAgo(threat.published_date)})
                    </div>
                  </div>
                  
                  <div className="flex md:flex-col gap-2">
                    {threat.url && (
                      <a
                        href={threat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline flex items-center"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Source
                      </a>
                    )}
                    <button
                      onClick={() => handleCopyToClipboard(threat.title, threat.id)}
                      className="btn-outline flex items-center"
                    >
                      {copied === threat.id ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2 text-success-light" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Title
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </motion.div>
      )}

      {/* Educational Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-12"
      >
        <Card className="p-8 border border-primary/30">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Understanding Threat Intelligence</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Vulnerabilities</h3>
              <p className="text-gray-400">Weaknesses in software, hardware, or processes that can be exploited by attackers. Regularly check for CVEs affecting your systems.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-accent-blue" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Threat Actors</h3>
              <p className="text-gray-400">Individuals, groups, or organizations that conduct malicious activities. Understanding their tactics helps in building better defenses.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-accent-green" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Indicators of Compromise</h3>
              <p className="text-gray-400">Artifacts observed on networks or systems that indicate a potential security breach. Use these to detect intrusions early.</p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-background-light rounded-lg">
            <h3 className="text-lg font-bold text-white mb-2">Data Sources</h3>
            <p className="text-gray-400 mb-4">This threat intelligence feed integrates data from multiple sources:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <Globe className="h-5 w-5 text-primary mt-1 mr-2" />
                <div>
                  <p className="text-white font-medium">NIST National Vulnerability Database (NVD)</p>
                  <p className="text-sm text-gray-400">Comprehensive database of security vulnerabilities</p>
                </div>
              </div>
              <div className="flex items-start">
                <Shield className="h-5 w-5 text-accent-blue mt-1 mr-2" />
                <div>
                  <p className="text-white font-medium">AlienVault Open Threat Exchange (OTX)</p>
                  <p className="text-sm text-gray-400">Community-powered threat intelligence sharing platform</p>
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-warning-light mt-1 mr-2" />
                <div>
                  <p className="text-white font-medium">PhishTank</p>
                  <p className="text-sm text-gray-400">Community-based phishing website verification service</p>
                </div>
              </div>
              <div className="flex items-start">
                <Server className="h-5 w-5 text-accent-green mt-1 mr-2" />
                <div>
                  <p className="text-white font-medium">Abuse.ch</p>
                  <p className="text-sm text-gray-400">Tracking of malware, botnets, and other threats</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-background-light rounded-lg">
            <h3 className="text-lg font-bold text-white mb-2">Using This Data</h3>
            <p className="text-gray-400 mb-4">Here are some ways to leverage threat intelligence in your security operations:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <FileJson className="h-5 w-5 text-primary mt-1 mr-2" />
                <div>
                  <p className="text-white font-medium">Export and Analyze</p>
                  <p className="text-sm text-gray-400">Download vulnerability data in JSON format for further analysis in your security tools.</p>
                </div>
              </div>
              <div className="flex items-start">
                <Link className="h-5 w-5 text-accent-blue mt-1 mr-2" />
                <div>
                  <p className="text-white font-medium">Correlate with Your Assets</p>
                  <p className="text-sm text-gray-400">Match vulnerabilities against your organization's software inventory to prioritize patching.</p>
                </div>
              </div>
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-warning-light mt-1 mr-2" />
                <div>
                  <p className="text-white font-medium">Create Security Advisories</p>
                  <p className="text-sm text-gray-400">Use this data to create internal security bulletins for your organization.</p>
                </div>
              </div>
              <div className="flex items-start">
                <RefreshCw className="h-5 w-5 text-accent-green mt-1 mr-2" />
                <div>
                  <p className="text-white font-medium">Regular Monitoring</p>
                  <p className="text-sm text-gray-400">Check for new vulnerabilities daily, especially for critical systems in your environment.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default ThreatIntelligencePage;