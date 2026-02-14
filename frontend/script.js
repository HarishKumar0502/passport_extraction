// ===== Configuration =====
const API_BASE_URL = 'http://localhost:8000';

// ===== DOM Elements =====
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileIcon = document.getElementById('fileIcon');
const removeFileBtn = document.getElementById('removeFileBtn');
const pdfPageSelector = document.getElementById('pdfPageSelector');
const pageNumberInput = document.getElementById('pageNumber');
const extractBtn = document.getElementById('extractBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsContent = document.getElementById('resultsContent');
const resultsMetadata = document.getElementById('resultsMetadata');
const newExtractionBtn = document.getElementById('newExtractionBtn');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const closeErrorBtn = document.getElementById('closeErrorBtn');
const statusIndicator = document.getElementById('statusIndicator');

// ===== State =====
let selectedFile = null;

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    checkBackendHealth();
});

// ===== Event Listeners =====
function initializeEventListeners() {
    // Upload area click
    uploadArea.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    // Remove file
    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearFileSelection();
    });

    // Extract button
    extractBtn.addEventListener('click', handleExtraction);

    // New extraction button
    newExtractionBtn.addEventListener('click', resetToUpload);

    // Close error
    closeErrorBtn.addEventListener('click', hideError);
}

// ===== Backend Health Check =====
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();

        if (data.status === 'healthy') {
            updateStatus('connected', 'Backend Connected');
        } else {
            updateStatus('error', 'Backend Error');
        }
    } catch (error) {
        updateStatus('error', 'Backend Offline');
        console.error('Health check failed:', error);
    }
}

function updateStatus(status, text) {
    statusIndicator.className = `status-indicator ${status}`;
    statusIndicator.querySelector('.status-text').textContent = text;
}

// ===== File Handling =====
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');

    const file = event.dataTransfer.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
        showError('Invalid file type. Please upload a PDF or image file.');
        return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showError('File too large. Maximum size is 10MB.');
        return;
    }

    selectedFile = file;
    displayFileInfo(file);
    extractBtn.disabled = false;
}

function displayFileInfo(file) {
    // Show file info section
    uploadArea.style.display = 'none';
    fileInfo.style.display = 'block';

    // Set file details
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    // Set file icon
    if (file.type === 'application/pdf') {
        fileIcon.textContent = '📄';
        pdfPageSelector.style.display = 'flex';
    } else {
        fileIcon.textContent = '🖼️';
        pdfPageSelector.style.display = 'none';
    }
}

function clearFileSelection() {
    selectedFile = null;
    fileInput.value = '';
    uploadArea.style.display = 'block';
    fileInfo.style.display = 'none';
    extractBtn.disabled = true;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ===== Extraction =====
async function handleExtraction() {
    if (!selectedFile) return;

    // Show loading state
    setLoadingState(true);
    hideError();

    try {
        // Prepare form data
        const formData = new FormData();
        formData.append('file', selectedFile);

        // Add page number for PDFs
        if (selectedFile.type === 'application/pdf') {
            const pageNumber = parseInt(pageNumberInput.value) || 1;
            formData.append('page_number', pageNumber);
        }

        // Send request
        const response = await fetch(`${API_BASE_URL}/extract`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Extraction failed');
        }

        const data = await response.json();

        // Display results
        displayResults(data);

    } catch (error) {
        console.error('Extraction error:', error);
        showError(error.message || 'Failed to extract passport data. Please try again.');
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(isLoading) {
    const btnText = extractBtn.querySelector('.btn-text');
    const btnLoader = extractBtn.querySelector('.btn-loader');

    if (isLoading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
        extractBtn.disabled = true;
    } else {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        extractBtn.disabled = false;
    }
}

// ===== Results Display =====
function displayResults(data) {
    // Hide upload section, show results
    document.querySelector('.upload-section').style.display = 'none';
    resultsSection.style.display = 'block';

    // Clear previous results
    resultsContent.innerHTML = '';
    resultsMetadata.innerHTML = '';

    // Display extracted images (photo and signature)
    if (data.extracted_images && Object.keys(data.extracted_images).length > 0) {
        Object.entries(data.extracted_images).forEach(([fieldName, fieldData]) => {
            const imageElement = createImageElement(fieldName, fieldData);
            resultsContent.appendChild(imageElement);
        });
    }
    // Display text fields if available
    else if (data.fields && Object.keys(data.fields).length > 0) {
        Object.entries(data.fields).forEach(([fieldName, fieldData]) => {
            const fieldElement = createFieldElement(fieldName, fieldData);
            resultsContent.appendChild(fieldElement);
        });
    }
    // No data detected
    else {
        resultsContent.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No photo or signature detected. Please ensure the passport image is clear and properly oriented.</p>';
    }

    // Display success message if available
    if (data.message) {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = 'padding: 1rem; background: rgba(102, 126, 234, 0.1); border-radius: 8px; margin-bottom: 1rem; text-align: center; color: var(--text-primary);';
        messageDiv.textContent = data.message;
        resultsContent.insertBefore(messageDiv, resultsContent.firstChild);
    }

    // Display metadata
    if (data.metadata) {
        displayMetadata(data.metadata);
    }

    // Display model info
    if (data.model_type) {
        const modelInfo = document.createElement('div');
        modelInfo.className = 'metadata-item';
        modelInfo.innerHTML = `
            <span class="metadata-label">Model Type</span>
            <span class="metadata-value">${data.model_type.toUpperCase()}</span>
        `;
        resultsMetadata.appendChild(modelInfo);
    }
}

function createImageElement(fieldName, fieldData) {
    const container = document.createElement('div');
    container.className = 'result-field image-result';

    const label = document.createElement('div');
    label.className = 'field-label';
    label.textContent = formatFieldName(fieldName);

    const imageWrapper = document.createElement('div');
    imageWrapper.style.cssText = 'margin-top: 1rem; text-align: center;';

    const img = document.createElement('img');
    img.src = `${API_BASE_URL}${fieldData.url}`;
    img.alt = fieldName;
    img.style.cssText = 'max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';

    const downloadBtn = document.createElement('a');
    downloadBtn.href = `${API_BASE_URL}${fieldData.url}`;
    downloadBtn.download = `${fieldName}.png`;
    downloadBtn.className = 'download-btn';
    downloadBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right: 0.5rem;">
            <path d="M8 11L4 7H7V3H9V7H12L8 11Z" fill="currentColor"/>
            <path d="M3 13H13V15H3V13Z" fill="currentColor"/>
        </svg>
        Download ${formatFieldName(fieldName)}
    `;
    downloadBtn.style.cssText = 'display: inline-flex; align-items: center; margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-gradient); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; transition: transform 0.2s;';
    downloadBtn.onmouseover = () => downloadBtn.style.transform = 'translateY(-2px)';
    downloadBtn.onmouseout = () => downloadBtn.style.transform = 'translateY(0)';

    imageWrapper.appendChild(img);
    imageWrapper.appendChild(document.createElement('br'));
    imageWrapper.appendChild(downloadBtn);

    container.appendChild(label);
    container.appendChild(imageWrapper);

    // Add confidence if available
    if (fieldData.confidence !== undefined) {
        const confidence = document.createElement('div');
        confidence.className = 'field-confidence';

        const confidencePercent = Math.round(fieldData.confidence * 100);
        confidence.innerHTML = `
            Detection Confidence: ${confidencePercent}%
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${confidencePercent}%"></div>
            </div>
        `;

        container.appendChild(confidence);
    }

    return container;
}

function createFieldElement(fieldName, fieldData) {
    const field = document.createElement('div');
    field.className = 'result-field';

    const label = document.createElement('div');
    label.className = 'field-label';
    label.textContent = formatFieldName(fieldName);

    const value = document.createElement('div');
    value.className = 'field-value';
    value.textContent = fieldData.value || 'Not detected';

    field.appendChild(label);
    field.appendChild(value);

    // Add confidence if available
    if (fieldData.confidence !== undefined) {
        const confidence = document.createElement('div');
        confidence.className = 'field-confidence';

        const confidencePercent = Math.round(fieldData.confidence * 100);
        confidence.innerHTML = `
            Confidence: ${confidencePercent}%
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${confidencePercent}%"></div>
            </div>
        `;

        field.appendChild(confidence);
    }

    return field;
}

function formatFieldName(name) {
    return name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}

function displayMetadata(metadata) {
    if (metadata.filename) {
        const item = document.createElement('div');
        item.className = 'metadata-item';
        item.innerHTML = `
            <span class="metadata-label">File Name</span>
            <span class="metadata-value">${metadata.filename}</span>
        `;
        resultsMetadata.appendChild(item);
    }

    if (metadata.file_type) {
        const item = document.createElement('div');
        item.className = 'metadata-item';
        item.innerHTML = `
            <span class="metadata-label">File Type</span>
            <span class="metadata-value">${metadata.file_type.toUpperCase()}</span>
        `;
        resultsMetadata.appendChild(item);
    }

    if (metadata.page_number) {
        const item = document.createElement('div');
        item.className = 'metadata-item';
        item.innerHTML = `
            <span class="metadata-label">Page Number</span>
            <span class="metadata-value">${metadata.page_number}</span>
        `;
        resultsMetadata.appendChild(item);
    }
}

// ===== Reset =====
function resetToUpload() {
    document.querySelector('.upload-section').style.display = 'block';
    resultsSection.style.display = 'none';
    clearFileSelection();
}

// ===== Error Handling =====
function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(hideError, 5000);
}

function hideError() {
    errorMessage.style.display = 'none';
}
