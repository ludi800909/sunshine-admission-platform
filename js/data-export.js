/**
 * 数据导出核心功能模块
 * 支持Excel、CSV、PDF格式导出
 * 包含导出历史记录和管理功能
 */

class DataExportManager {
    constructor() {
        this.exportHistory = this.loadExportHistory();
        this.initializeExportUI();
    }

    // 加载导出历史
    loadExportHistory() {
        const saved = localStorage.getItem('exportHistory');
        return saved ? JSON.parse(saved) : [];
    }

    // 保存导出历史
    saveExportHistory() {
        localStorage.setItem('exportHistory', JSON.stringify(this.exportHistory));
    }

    // 添加导出记录
    addExportRecord(record) {
        const exportRecord = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...record
        };
        this.exportHistory.unshift(exportRecord);
        
        // 限制历史记录数量
        if (this.exportHistory.length > 100) {
            this.exportHistory = this.exportHistory.slice(0, 100);
        }
        
        this.saveExportHistory();
        return exportRecord;
    }

    // 导出为CSV格式
    exportToCSV(data, filename, options = {}) {
        try {
            if (!data || data.length === 0) {
                throw new Error('没有可导出的数据');
            }

            const headers = options.headers || Object.keys(data[0]);
            const csvContent = this.generateCSVContent(data, headers, options);
            
            this.downloadFile(csvContent, filename + '.csv', 'text/csv;charset=utf-8;');
            
            this.addExportRecord({
                type: 'CSV',
                filename: filename + '.csv',
                recordCount: data.length,
                status: 'success'
            });

            return true;
        } catch (error) {
            console.error('CSV导出失败:', error);
            this.showExportError('CSV导出失败: ' + error.message);
            return false;
        }
    }

    // 生成CSV内容
    generateCSVContent(data, headers, options) {
        const separator = options.separator || ',';
        const includeHeaders = options.includeHeaders !== false;
        
        let csvContent = '';
        
        // 添加BOM以支持中文
        csvContent += '\uFEFF';
        
        // 添加表头
        if (includeHeaders) {
            csvContent += headers.map(header => this.escapeCSVField(header)).join(separator) + '\n';
        }
        
        // 添加数据行
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                return this.escapeCSVField(value.toString());
            });
            csvContent += values.join(separator) + '\n';
        });
        
        return csvContent;
    }

    // 转义CSV字段
    escapeCSVField(field) {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return '"' + field.replace(/"/g, '""') + '"';
        }
        return field;
    }

    // 导出为Excel格式（使用HTML表格方式）
    exportToExcel(data, filename, options = {}) {
        try {
            if (!data || data.length === 0) {
                throw new Error('没有可导出的数据');
            }

            const headers = options.headers || Object.keys(data[0]);
            const excelContent = this.generateExcelContent(data, headers, options);
            
            this.downloadFile(excelContent, filename + '.xls', 'application/vnd.ms-excel;charset=utf-8;');
            
            this.addExportRecord({
                type: 'Excel',
                filename: filename + '.xls',
                recordCount: data.length,
                status: 'success'
            });

            return true;
        } catch (error) {
            console.error('Excel导出失败:', error);
            this.showExportError('Excel导出失败: ' + error.message);
            return false;
        }
    }

    // 生成Excel内容
    generateExcelContent(data, headers, options) {
        const title = options.title || '数据导出';
        const sheetName = options.sheetName || 'Sheet1';
        
        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                  xmlns:x="urn:schemas-microsoft-com:office:excel" 
                  xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                <meta name="ProgId" content="Excel.Sheet">
                <meta name="Generator" content="Microsoft Excel 11">
                <style>
                    .header { background-color: #4472C4; color: white; font-weight: bold; }
                    .data { border: 1px solid #ccc; }
                    table { border-collapse: collapse; width: 100%; }
                    td, th { border: 1px solid #ccc; padding: 8px; text-align: left; }
                </style>
            </head>
            <body>
                <table>
                    <tr>
                        <td colspan="${headers.length}" style="font-size: 18px; font-weight: bold; text-align: center; padding: 20px;">
                            ${title}
                        </td>
                    </tr>
                    <tr>
                        <td colspan="${headers.length}" style="text-align: center; padding: 10px;">
                            导出时间: ${new Date().toLocaleString()}
                        </td>
                    </tr>
                    <tr class="header">
        `;
        
        // 添加表头
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr>';
        
        // 添加数据行
        data.forEach(row => {
            html += '<tr class="data">';
            headers.forEach(header => {
                const value = row[header] || '';
                html += `<td>${this.escapeHtml(value.toString())}</td>`;
            });
            html += '</tr>';
        });
        
        html += `
                </table>
            </body>
            </html>
        `;
        
        return html;
    }

    // 导出为PDF格式（使用打印功能）
    exportToPDF(data, filename, options = {}) {
        try {
            if (!data || data.length === 0) {
                throw new Error('没有可导出的数据');
            }

            const headers = options.headers || Object.keys(data[0]);
            this.generatePDFPreview(data, headers, options, filename);
            
            this.addExportRecord({
                type: 'PDF',
                filename: filename + '.pdf',
                recordCount: data.length,
                status: 'success'
            });

            return true;
        } catch (error) {
            console.error('PDF导出失败:', error);
            this.showExportError('PDF导出失败: ' + error.message);
            return false;
        }
    }

    // 生成PDF预览窗口
    generatePDFPreview(data, headers, options, filename) {
        const title = options.title || '数据导出';
        const printWindow = window.open('', '_blank');
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${filename}</title>
                <style>
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                    .export-info { font-size: 14px; color: #666; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .controls { margin-bottom: 20px; text-align: center; }
                    .btn { padding: 10px 20px; margin: 0 10px; border: none; border-radius: 4px; cursor: pointer; }
                    .btn-primary { background-color: #007bff; color: white; }
                    .btn-secondary { background-color: #6c757d; color: white; }
                </style>
            </head>
            <body>
                <div class="controls no-print">
                    <button class="btn btn-primary" onclick="window.print()">打印/保存为PDF</button>
                    <button class="btn btn-secondary" onclick="window.close()">关闭</button>
                </div>
                
                <div class="header">
                    <div class="title">${title}</div>
                    <div class="export-info">
                        导出时间: ${new Date().toLocaleString()} | 
                        记录数量: ${data.length} 条
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            ${headers.map(header => `<th>${this.escapeHtml(header)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                ${headers.map(header => `<td>${this.escapeHtml((row[header] || '').toString())}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="no-print" style="text-align: center; margin-top: 30px; color: #666;">
                    <p>提示: 使用浏览器的打印功能，选择"保存为PDF"来生成PDF文件</p>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
    }

    // 转义HTML字符
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 下载文件
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 清理URL对象
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
    }

    // 显示导出错误
    showExportError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast position-fixed top-0 end-0 m-3';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="toast-header bg-danger text-white">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong class="me-auto">导出失败</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        document.body.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    // 显示导出成功
    showExportSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'toast position-fixed top-0 end-0 m-3';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="toast-header bg-success text-white">
                <i class="fas fa-check me-2"></i>
                <strong class="me-auto">导出成功</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        document.body.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    // 初始化导出UI
    initializeExportUI() {
        // 创建导出历史模态框
        this.createExportHistoryModal();
    }

    // 创建导出历史模态框
    createExportHistoryModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'exportHistoryModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-history me-2"></i>导出历史
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <small class="text-muted">共 <span id="historyCount">0</span> 条记录</small>
                            </div>
                            <button class="btn btn-outline-danger btn-sm" id="clearHistory">
                                <i class="fas fa-trash me-1"></i>清空历史
                            </button>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>导出时间</th>
                                        <th>文件名</th>
                                        <th>格式</th>
                                        <th>记录数</th>
                                        <th>状态</th>
                                    </tr>
                                </thead>
                                <tbody id="historyTableBody">
                                </tbody>
                            </table>
                        </div>
                        <div id="noHistoryMessage" class="text-center text-muted py-4" style="display: none;">
                            <i class="fas fa-inbox fa-3x mb-3"></i>
                            <p>暂无导出历史记录</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定清空历史事件
        document.getElementById('clearHistory').addEventListener('click', () => {
            if (confirm('确定要清空所有导出历史记录吗？')) {
                this.exportHistory = [];
                this.saveExportHistory();
                this.updateHistoryDisplay();
            }
        });
    }

    // 显示导出历史
    showExportHistory() {
        this.updateHistoryDisplay();
        const modal = new bootstrap.Modal(document.getElementById('exportHistoryModal'));
        modal.show();
    }

    // 更新历史显示
    updateHistoryDisplay() {
        const tbody = document.getElementById('historyTableBody');
        const countSpan = document.getElementById('historyCount');
        const noHistoryMessage = document.getElementById('noHistoryMessage');
        
        countSpan.textContent = this.exportHistory.length;
        
        if (this.exportHistory.length === 0) {
            tbody.innerHTML = '';
            noHistoryMessage.style.display = 'block';
            return;
        }
        
        noHistoryMessage.style.display = 'none';
        
        tbody.innerHTML = this.exportHistory.map(record => `
            <tr>
                <td>${new Date(record.timestamp).toLocaleString()}</td>
                <td>${record.filename}</td>
                <td>
                    <span class="badge bg-primary">${record.type}</span>
                </td>
                <td>${record.recordCount}</td>
                <td>
                    <span class="badge ${record.status === 'success' ? 'bg-success' : 'bg-danger'}">
                        ${record.status === 'success' ? '成功' : '失败'}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // 获取导出历史
    getExportHistory() {
        return this.exportHistory;
    }

    // 清空导出历史
    clearExportHistory() {
        this.exportHistory = [];
        this.saveExportHistory();
    }
}

// 数据导出UI组件
class ExportUI {
    static createExportButton(options = {}) {
        const button = document.createElement('button');
        button.className = options.className || 'btn btn-outline-success';
        button.type = 'button';
        button.innerHTML = `<i class="fas fa-download me-1"></i>${options.text || '导出数据'}`;
        
        if (options.dropdown) {
            button.className += ' dropdown-toggle';
            button.setAttribute('data-bs-toggle', 'dropdown');
            
            const dropdown = document.createElement('ul');
            dropdown.className = 'dropdown-menu';
            dropdown.innerHTML = `
                <li><a class="dropdown-item export-csv" href="#"><i class="fas fa-file-csv me-2"></i>导出为CSV</a></li>
                <li><a class="dropdown-item export-excel" href="#"><i class="fas fa-file-excel me-2"></i>导出为Excel</a></li>
                <li><a class="dropdown-item export-pdf" href="#"><i class="fas fa-file-pdf me-2"></i>导出为PDF</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item export-history" href="#"><i class="fas fa-history me-2"></i>导出历史</a></li>
            `;
            
            const container = document.createElement('div');
            container.className = 'dropdown';
            container.appendChild(button);
            container.appendChild(dropdown);
            
            return container;
        }
        
        return button;
    }

    static createExportModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'exportModal';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-download me-2"></i>数据导出
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">导出格式</label>
                            <div class="btn-group w-100" role="group">
                                <input type="radio" class="btn-check" name="exportFormat" id="formatCSV" value="csv" checked>
                                <label class="btn btn-outline-primary" for="formatCSV">
                                    <i class="fas fa-file-csv me-1"></i>CSV
                                </label>
                                <input type="radio" class="btn-check" name="exportFormat" id="formatExcel" value="excel">
                                <label class="btn btn-outline-primary" for="formatExcel">
                                    <i class="fas fa-file-excel me-1"></i>Excel
                                </label>
                                <input type="radio" class="btn-check" name="exportFormat" id="formatPDF" value="pdf">
                                <label class="btn btn-outline-primary" for="formatPDF">
                                    <i class="fas fa-file-pdf me-1"></i>PDF
                                </label>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">文件名</label>
                            <input type="text" class="form-control" id="exportFilename" placeholder="请输入文件名">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">导出范围</label>
                            <select class="form-select" id="exportRange">
                                <option value="all">全部数据</option>
                                <option value="current">当前页面</option>
                                <option value="selected">选中项目</option>
                                <option value="custom">自定义范围</option>
                            </select>
                        </div>
                        <div class="mb-3" id="customRangeOptions" style="display: none;">
                            <div class="row">
                                <div class="col-6">
                                    <label class="form-label">开始日期</label>
                                    <input type="date" class="form-control" id="startDate">
                                </div>
                                <div class="col-6">
                                    <label class="form-label">结束日期</label>
                                    <input type="date" class="form-control" id="endDate">
                                </div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="includeHeaders" checked>
                                <label class="form-check-label" for="includeHeaders">
                                    包含表头
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="confirmExport">
                            <i class="fas fa-download me-1"></i>开始导出
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }
}

// 全局数据导出管理器实例
window.exportManager = new DataExportManager();

// 导出供其他模块使用
window.ExportUI = ExportUI;