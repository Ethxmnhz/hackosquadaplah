import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Edit2, Trash2, AlertTriangle, Tag, Terminal, Download, Monitor } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Lab, Tag as TagType } from '../../lib/types';
import Card from '../../components/ui/Card';

const LabsManagement = () => {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    loadLabs();
    loadTags();
  }, []);

  const loadLabs = async () => {
    try {
      const { data, error } = await supabase
        .from('labs')
        .select(`
          *,
          tags:lab_tags(
            tag:tags(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLabs(data || []);
    } catch (error) {
      console.error('Error loading labs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this lab?')) return;

    try {
      const { error } = await supabase
        .from('labs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadLabs();
    } catch (error) {
      console.error('Error deleting lab:', error);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('labs')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await loadLabs();
    } catch (error) {
      console.error('Error updating lab status:', error);
    }
  };

  const filteredLabs = labs.filter(lab => {
    const matchesSearch = lab.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lab.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || lab.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-success-dark/20 text-success-light';
      case 'archived':
        return 'bg-error-dark/20 text-error-light';
      default:
        return 'bg-warning-dark/20 text-warning-light';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Manage Labs</h1>
            <p className="text-gray-400">Create and manage hands-on cybersecurity labs</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = '/admin/operations'}
              className="btn-outline flex items-center"
            >
              <Monitor className="h-5 w-5 mr-2" />
              Operations
            </button>
            <button
              onClick={() => window.location.href = '/admin/labs/create'}
              className="btn-primary flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Lab
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search labs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background-light border border-background-default rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="form-input md:w-48"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-6"
      >
        {loading ? (
          <Card className="p-6">
            <div className="animate-pulse text-primary">Loading labs...</div>
          </Card>
        ) : filteredLabs.length === 0 ? (
          <Card className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No labs found</p>
            <button
              onClick={() => window.location.href = '/admin/labs/create'}
              className="btn-primary mt-4"
            >
              Create Your First Lab
            </button>
          </Card>
        ) : (
          filteredLabs.map((lab) => (
            <Card key={lab.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-bold text-white mb-2">{lab.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lab.status)}`}>
                      {lab.status.charAt(0).toUpperCase() + lab.status.slice(1)}
                    </span>
                  </div>
                  
                  <p className="text-gray-400 mb-4">{lab.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {lab.tags?.map(({ tag }) => (
                      <span key={tag.id} className="px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary flex items-center">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag.name}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {lab.docker_command && (
                      <div className="flex items-start gap-2 text-sm">
                        <Terminal className="h-4 w-4 text-accent-blue mt-1" />
                        <div>
                          <p className="text-gray-400">Docker Command:</p>
                          <code className="text-accent-blue font-mono bg-background-light px-2 py-1 rounded">
                            {lab.docker_command}
                          </code>
                        </div>
                      </div>
                    )}
                    
                    {lab.vm_download_url && (
                      <div className="flex items-start gap-2 text-sm">
                        <Download className="h-4 w-4 text-accent-green mt-1" />
                        <div>
                          <p className="text-gray-400">VM Download:</p>
                          <a 
                            href={lab.vm_download_url}
                            className="text-accent-green hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Download VM Image
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-gray-400">
                    Created: {new Date(lab.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex md:flex-col gap-2">
                  <button
                    onClick={() => window.location.href = `/admin/labs/edit/${lab.id}`}
                    className="btn-outline flex items-center"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  
                  <button
                    onClick={() => window.location.href = `/admin/operations?lab=${lab.id}`}
                    className="btn-outline flex items-center text-accent-blue border-accent-blue/30 hover:bg-accent-blue/10"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Operations
                  </button>
                  
                  {lab.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(lab.id, 'published')}
                      className="btn-primary flex items-center"
                    >
                      Publish
                    </button>
                  )}
                  
                  {lab.status === 'published' && (
                    <button
                      onClick={() => handleStatusChange(lab.id, 'archived')}
                      className="btn-outline flex items-center text-warning-light border-warning-light/30 hover:bg-warning-light/10"
                    >
                      Archive
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(lab.id)}
                    className="btn-outline flex items-center text-error-light border-error-light/30 hover:bg-error-light/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </motion.div>
    </div>
  );
};

export default LabsManagement;