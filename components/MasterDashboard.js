import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Text,
  Spinner,
  HStack,
  SimpleGrid,
  Heading,
  Stat,
  StatLabel,
  StatNumber
} from '@chakra-ui/react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Plus as AddIcon, Trash2 } from 'lucide-react';
import axios from 'axios';
import CreateMasterProjectModal from './CreateMasterProjectModal';

ChartJS.register(ArcElement, Tooltip, Legend);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pdf-api.enigmahealth.io/api';

const FILE_STATUS_COLORS = {
  input: '#63b3ed',     // blue
  processed: '#48bb78', // green
  failed: '#f56565'     // red
};

const MasterDashboard = ({ onSelectMasterProject }) => {
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/master-projects`);
      const masterProjects = response.data.masterProjects || [];
      const mastersWithFiles = await Promise.all(masterProjects.map(async m => {
        try {
          const projRes = await axios.get(`${API_BASE_URL}/projects`, {
            params: { masterProjectId: m.masterId }
          });
          const projects = projRes.data.projects || [];
          const fileCounts = { input: 0, processed: 0, failed: 0 };

          await Promise.all(projects.map(async p => {
            const projectId = p.project_id || p.projectId;
            if (!projectId) return;
            try {
              const statusRes = await axios.get(`${API_BASE_URL}/batch/projects/${projectId}/batch/status`);
              const data = statusRes.data || {};
              fileCounts.input += data.input_files || 0;
              fileCounts.processed += data.db_processed_files || 0;
              fileCounts.failed += data.failed_files || 0;
            } catch (err) {
              console.error('Error loading batch status for', projectId, err);
            }
          }));

          return { ...m, fileCounts };
        } catch (err) {
          console.error('Error loading sub projects for', m.masterId, err);
          return { ...m, fileCounts: {} };
        }
      }));
      setMasters(mastersWithFiles);
      setError(null);
    } catch (err) {
      console.error('Error loading master projects:', err);
      setError('Failed to load master projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreated = () => {
    setIsCreateOpen(false);
    loadMasters();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete master project "${id}" and all its sub-projects?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/master-projects/${id}`);
      loadMasters();
    } catch (err) {
      console.error('Error deleting master project:', err);
      alert('Failed to delete master project');
    }
  };

  const getChartData = counts => {
    const labelMap = {
      input: 'Input Files',
      processed: 'Processed Files',
      failed: 'Failed Files'
    };
    const keys = Object.keys(counts).filter(k => counts[k] > 0);
    const data = keys.map(k => counts[k]);
    const backgroundColor = keys.map(k => FILE_STATUS_COLORS[k] || '#718096');
    const labels = keys.map(k => labelMap[k] || k);
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor
        }
      ]
    };
  };

  if (loading) {
    return (
      <Box textAlign='center' py={8}>
        <Spinner size='lg' />
        <Text mt={4} color='gray.300'>Loading master projects...</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        leftIcon={<AddIcon />}
        colorScheme='blue'
        mb={4}
        onClick={() => setIsCreateOpen(true)}
      >
        Create Master Project
      </Button>

      <CreateMasterProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      {error && <Text color='red.400' mb={4}>{error}</Text>}

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {masters.map(m => (
          <Box
            key={m.masterId}
            p={4}
            borderWidth='1px'
            borderRadius='md'
            borderColor='gray.600'
            _hover={{ boxShadow: 'lg', cursor: 'pointer' }}
            onClick={() => onSelectMasterProject(m)}
          >
            <HStack justify='space-between' align='start' mb={2}>
              <Heading size='md'>{m.masterId}</Heading>
              <IconButton size='sm' colorScheme='red' icon={<Trash2 size={14} />} onClick={e => handleDelete(m.masterId, e)} />
            </HStack>
            <Text mb={4} color='gray.500' fontSize='sm'>
              {m.description}
            </Text>

             {m.fileCounts && Object.values(m.fileCounts).some(v => v > 0) && (
              <Box height='200px'>
                <Pie
                  data={getChartData(m.fileCounts)}
                  options={{
                    plugins: { legend: { position: 'bottom', labels: { color: '#838383ff' } } },
                    maintainAspectRatio: false
                  }}
                />
              </Box>
            )}

            <HStack mt={4} spacing={8}>
              <Stat>
                <StatLabel>Sub Projects</StatLabel>
                <StatNumber>{m.subProjectsCount || 0}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Total Files</StatLabel>
                <StatNumber>{m.totalFiles || 0}</StatNumber>
              </Stat>
            </HStack>
            <Text mt={4} fontSize='sm' color='gray.400'>
              Last Modified: {m.lastModified ? new Date(m.lastModified).toLocaleString() : 'N/A'}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default MasterDashboard;