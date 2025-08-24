const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Helper to format media URLs
function formatMediaUrl(url) {
  if (!url) return url;
  if (!url.startsWith('http')) return url;
  if (url.startsWith('http://')) return url.replace('http://', 'https://');
  return url;
}

// Helper function to upload file to media service
async function uploadToMediaService(filePath, originalName) {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), originalName);
    const uploadRes = await axios.post('https://media.dexprosolutions.com/media/upload', form, {
      headers: form.getHeaders(),
    });
    if (uploadRes.data && uploadRes.data.success && uploadRes.data.file && uploadRes.data.file.url) {
      return uploadRes.data.file.url;
    }
    throw new Error('Upload response not valid');
  } catch (error) {
    console.error('Error uploading to media service:', error);
    throw error;
  }
}

// Helper function to upload single file
async function uploadSingleFile(file, fieldName = 'file') {
  if (!file) return null;
  
  try {
    return await uploadToMediaService(file.path, file.originalname);
  } catch (uploadErr) {
    console.error(`Error uploading ${fieldName}:`, uploadErr);
    throw new Error(`Failed to upload ${fieldName}`);
  }
}

// Helper function to upload multiple files
async function uploadMultipleFiles(files, fieldName = 'files') {
  if (!files || !Array.isArray(files)) return [];
  
  const uploadPromises = files.map(file => 
    uploadToMediaService(file.path, file.originalname)
  );
  
  try {
    return await Promise.all(uploadPromises);
  } catch (uploadErr) {
    console.error(`Error uploading ${fieldName}:`, uploadErr);
    throw new Error(`Failed to upload ${fieldName}`);
  }
}

module.exports = {
  formatMediaUrl,
  uploadToMediaService,
  uploadSingleFile,
  uploadMultipleFiles
}; 