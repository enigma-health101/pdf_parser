import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Text,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  TableContainer
} from '@chakra-ui/react';
import { Plus as AddIcon, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pdf-api.enigmahealth.io/api';

const MasterProjectList = ({ onSelectMasterProject }) => {
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ masterId: '', description: '' });

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/master-projects`);
      setMasters(response.data.masterProjects || []);
      setError(null);
    } catch (err) {
      console.error('Error loading master projects:', err);
      setError('Failed to load master projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.masterId.trim() || !formData.description.trim()) return;
    try {
      await axios.post(`${API_BASE_URL}/master-projects`, formData);
      setShowCreateForm(false);
      setFormData({ masterId: '', description: '' });
      loadMasters();
    } catch (err) {
      console.error('Error creating master project:', err);
      alert('Failed to create master project');
    }
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

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" />
        <Text mt={4} color="gray.300">Loading master projects...</Text>
      </Box>
    );
  }

  return (
    <Box>
      {showCreateForm ? (
        <Box mb={6} p={4} borderWidth="1px" borderRadius="md" borderColor="gray.600">
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Master Project ID</FormLabel>
              <Input value={formData.masterId} onChange={e => setFormData({ ...formData, masterId: e.target.value })} />
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </FormControl>
            <HStack spacing={4} justify="flex-end">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              <Button colorScheme="blue" onClick={handleCreate}>Create</Button>
            </HStack>
          </VStack>
        </Box>
      ) : (
        <Button leftIcon={<AddIcon />} colorScheme="blue" mb={4} onClick={() => setShowCreateForm(true)}>
          Create Master Project
        </Button>
      )}

      {error && <Text color="red.400" mb={4}>{error}</Text>}

      <TableContainer>
        <Table variant="simple" colorScheme="gray">
          <Thead>
            <Tr>
              <Th>Master ID</Th>
              <Th>Description</Th>
              <Th isNumeric>Sub Projects</Th>
              <Th isNumeric>Total Files</Th>
              <Th>Last Modified</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {masters.map(m => (
              <Tr key={m.masterId} _hover={{ bg: 'cyan.100', cursor: 'pointer' }} onClick={() => onSelectMasterProject(m)}>
                <Td>{m.masterId}</Td>
                <Td>{m.description}</Td>
                <Td isNumeric>{m.subProjectsCount || 0}</Td>
                <Td isNumeric>{m.totalFiles || 0}</Td>
                <Td>{m.lastModified ? new Date(m.lastModified).toLocaleString() : ''}</Td>
                <Td>
                  <Button size="sm" colorScheme="red" leftIcon={<Trash2 size={14} />} onClick={(e) => handleDelete(m.masterId, e)}>
                    Delete
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MasterProjectList;