import { create } from 'zustand';
import axios from 'axios';

const API_BASE = '/api';

export const useDocumentStore = create((set, get) => ({
  documents: [],
  currentDocument: null,
  collaborators: [],
  isLoading: false,
  error: null,

  // Fetch all documents
  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.get(`${API_BASE}/documents`);
      set({ documents: res.data.data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Create new document
  createDocument: async ({ title, type, content = '' }) => {
    try {
      const res = await axios.post(`${API_BASE}/documents`, { title, type, content });
      const doc = res.data.data;
      set(state => ({ documents: [doc, ...state.documents] }));
      return doc;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Fetch single document
  fetchDocument: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.get(`${API_BASE}/documents/${id}`);
      set({ currentDocument: res.data.data, isLoading: false });
      return res.data.data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Update document
  updateDocument: async (id, { title, content }) => {
    try {
      const res = await axios.put(`${API_BASE}/documents/${id}`, { title, content });
      const updated = res.data.data;
      
      set(state => ({
        currentDocument: updated,
        documents: state.documents.map(d => d.id === id ? updated : d)
      }));
      
      return updated;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Delete document
  deleteDocument: async (id) => {
    try {
      await axios.delete(`${API_BASE}/documents/${id}`);
      set(state => ({
        documents: state.documents.filter(d => d.id !== id),
        currentDocument: state.currentDocument?.id === id ? null : state.currentDocument
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Set collaborators
  setCollaborators: (collaborators) => set({ collaborators }),

  // Clear current document
  clearCurrentDocument: () => set({ currentDocument: null }),

  // Clear error
  clearError: () => set({ error: null })
}));
