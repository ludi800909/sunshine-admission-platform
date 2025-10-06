/**
 * 系统集成优化模块
 * 实现跨模块数据共享、统一用户画像构建、智能推荐系统优化、系统性能调优
 */

// 统一数据管理系统
class UnifiedDataManager {
    constructor() {
        this.dataStore = {
            userProfiles: JSON.parse(localStorage.getItem('userProfiles') || '{}'),
            crossModuleData: JSON.parse(localStorage.getItem('crossModuleData') || '{}'),
            behaviorData: JSON.parse(localStorage.getItem('behaviorData') || '{}'),
            aiInteractions: JSON.parse(localStorage.getItem('aiInteractions') || '{}')
        };
        this.subscribers = {};
        this.init();
    }

    init() {
        // 初始化数据同步
        this.syncDataAcrossModules();
        // 启动定期数据清理
        this.startDataCleanup();
        console.log('统一数据管理系统已初始化');
    }

    // 订阅数据变更
    subscribe(eventType, callback) {
        if (!this.subscribers[eventType]) {
            this.subscribers[eventType] = [];
        }
        this.subscribers[eventType].push(callback);
    }

    // 发布数据变更事件
    publish(eventType, data) {
        if (this.subscribers[eventType]) {
            this.subscribers[eventType].forEach(callback => callback(data));
        }
    }

    // 更新用户画像数据
    updateUserProfile(userId, profileData) {
        if (!this.dataStore.userProfiles[userId]) {
            this.dataStore.userProfiles[userId] = {
                id: userId,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };
        }

        // 合并新数据
        Object.assign(this.dataStore.userProfiles[userId], profileData, {
            lastUpdated: new Date().toISOString()
        });

        // 保存到localStorage
        localStorage.setItem('userProfiles', JSON.stringify(this.dataStore.userProfiles));
        
        // 发布更新事件
        this.publish('userProfileUpdated', {
            userId: userId,
            profile: this.dataStore.userProfiles[userId]
        });
    }

    // 获取用户画像
    getUserProfile(userId) {
        return this.dataStore.userProfiles[userId] || null;
    }

    // 跨模块数据共享
    shareDataAcrossModules(moduleId, dataType, data) {
        const key = `${moduleId}_${dataType}`;
        this.dataStore.crossModuleData[key] = {
            data: data,
            timestamp: new Date().toISOString(),
            moduleId: moduleId,
            dataType: dataType
        };

        localStorage.setItem('crossModuleData', JSON.stringify(this.dataStore.crossModuleData));
        
        // 通知其他模块数据更新
        this.publish('crossModuleDataUpdated', {
            moduleId: moduleId,
            dataType: dataType,
            data: data
        });
    }

    // 获取跨模块数据
    getCrossModuleData(moduleId, dataType) {
        const key = `${moduleId}_${dataType}`;
        return this.dataStore.crossModuleData[key] || null;
    }

    // 记录用户行为
    recordBehavior(userId, behaviorType, behaviorData) {
        if (!this.dataStore.behaviorData[userId]) {
            this.dataStore.behaviorData[userId] = [];
        }

        this.dataStore.behaviorData[userId].push({
            type: behaviorType,
            data: behaviorData,
            timestamp: new Date().toISOString()
        });

        // 保持最近100条记录
        if (this.dataStore.behaviorData[userId].length > 100) {
            this.dataStore.behaviorData[userId] = this.dataStore.behaviorData[userId].slice(-100);
        }

        localStorage.setItem('behaviorData', JSON.stringify(this.dataStore.behaviorData));
        
        // 更新用户画像
        this.updateUserProfileFromBehavior(userId, behaviorType, behaviorData);
    }

    // 根据行为数据更新用户画像
    updateUserProfileFromBehavior(userId, behaviorType, behaviorData) {
        const profile = this.getUserProfile(userId) || {};
        
        // 更新兴趣标签
        if (!profile.interests) profile.interests = {};
        if (!profile.activityLevel) profile.activityLevel = 0;
        
        switch (behaviorType) {
            case 'pageView':
                profile.activityLevel += 1;
                if (behaviorData.page) {
                    profile.interests[behaviorData.page] = (profile.interests[behaviorData.page] || 0) + 1;
                }
                break;
            case 'aiInteraction':
                profile.activityLevel += 2;
                profile.aiEngagement = (profile.aiEngagement || 0) + 1;
                break;
            case 'featureUsage':
                profile.activityLevel += 1;
                if (behaviorData.feature) {
                    profile.interests[behaviorData.feature] = (profile.interests[behaviorData.feature] || 0) + 1;
                }
                break;
        }

        this.updateUserProfile(userId, profile);
    }

    // 数据同步
    syncDataAcrossModules() {
        // 同步各模块数据
        const modules = ['admission', 'academic', 'evaluation', 'dashboard', 'studyAbroad'];
        
        modules.forEach(module => {
            const moduleData = localStorage.getItem(`${module}Data`);
            if (moduleData) {
                try {
                    const parsedData = JSON.parse(moduleData);
                    this.shareDataAcrossModules(module, 'moduleData', parsedData);
                } catch (error) {
                    console.warn(`Failed to sync data for module ${module}:`, error);
                }
            }
        });
    }

    // 定期数据清理
    startDataCleanup() {
        setInterval(() => {
            this.cleanupOldData();
        }, 24 * 60 * 60 * 1000); // 每24小时清理一次
    }

    // 清理过期数据
    cleanupOldData() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        // 清理过期的跨模块数据
        Object.keys(this.dataStore.crossModuleData).forEach(key => {
            const item = this.dataStore.crossModuleData[key];
            if (new Date(item.timestamp) < thirtyDaysAgo) {
                delete this.dataStore.crossModuleData[key];
            }
        });

        // 清理过期的行为数据
        Object.keys(this.dataStore.behaviorData).forEach(userId => {
            this.dataStore.behaviorData[userId] = this.dataStore.behaviorData[userId].filter(
                behavior => new Date(behavior.timestamp) >= thirtyDaysAgo
            );
        });

        // 保存清理后的数据
        localStorage.setItem('crossModuleData', JSON.stringify(this.dataStore.crossModuleData));
        localStorage.setItem('behaviorData', JSON.stringify(this.dataStore.behaviorData));
        
        console.log('数据清理完成');
    }
}

// 智能推荐系统
class IntelligentRecommendationSystem {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.apiKey = 'sk-3cdcf9f01e5141d09060b4b76045edda';
        this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
        this.recommendations = JSON.parse(localStorage.getItem('recommendations') || '{}');
        this.init();
    }

    init() {
        // 订阅用户画像更新事件
        this.dataManager.subscribe('userProfileUpdated', (data) => {
            this.generateRecommendations(data.userId);
        });
        console.log('智能推荐系统已初始化');
    }

    // 生成个性化推荐
    async generateRecommendations(userId) {
        try {
            const userProfile = this.dataManager.getUserProfile(userId);
            if (!userProfile) return;

            const recommendations = await this.callAIRecommendation(userProfile);
            
            this.recommendations[userId] = {
                recommendations: recommendations,
                generatedAt: new Date().toISOString(),
                profile: userProfile
            };

            localStorage.setItem('recommendations', JSON.stringify(this.recommendations));
            
            // 发布推荐更新事件
            this.dataManager.publish('recommendationsUpdated', {
                userId: userId,
                recommendations: recommendations
            });

        } catch (error) {
            console.error('生成推荐失败:', error);
        }
    }

    // 调用AI生成推荐
    async callAIRecommendation(userProfile) {
        const prompt = `基于以下用户画像生成个性化推荐：
        用户兴趣: ${JSON.stringify(userProfile.interests || {})}
        活跃度: ${userProfile.activityLevel || 0}
        AI交互次数: ${userProfile.aiEngagement || 0}
        
        请生成以下类型的推荐：
        1. 学习路径推荐（3个）
        2. 功能使用建议（3个）
        3. 院校推荐（3个）
        4. 专业推荐（3个）
        
        请以JSON格式返回，包含type、title、description、priority字段。`;

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的教育推荐系统，根据用户画像生成个性化推荐。返回结构化的JSON数据。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
            return JSON.parse(content);
        } catch (error) {
            // 如果AI返回的不是有效JSON，返回默认推荐
            return this.getDefaultRecommendations();
        }
    }

    // 获取默认推荐
    getDefaultRecommendations() {
        return [
            {
                type: 'learningPath',
                title: '计算机科学学习路径',
                description: '适合对编程和技术感兴趣的学生',
                priority: 'high'
            },
            {
                type: 'feature',
                title: '使用AI助手功能',
                description: '体验智能对话和个性化建议',
                priority: 'medium'
            },
            {
                type: 'college',
                title: '推荐院校：清华大学',
                description: '国内顶尖理工科院校',
                priority: 'high'
            }
        ];
    }

    // 获取用户推荐
    getUserRecommendations(userId) {
        return this.recommendations[userId] || null;
    }

    // 显示推荐面板
    showRecommendationPanel(userId) {
        const recommendations = this.getUserRecommendations(userId);
        if (!recommendations) {
            this.generateRecommendations(userId);
            return;
        }

        this.displayRecommendations(recommendations.recommendations);
    }

    // 显示推荐内容
    displayRecommendations(recommendations) {
        // 创建推荐面板
        let panel = document.getElementById('recommendationPanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'recommendationPanel';
            panel.className = 'position-fixed bg-white border rounded shadow-lg p-4';
            panel.style.cssText = 'top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999; max-width: 500px; max-height: 600px; overflow-y: auto;';
            document.body.appendChild(panel);
        }

        panel.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0"><i class="fas fa-lightbulb text-warning"></i> 个性化推荐</h5>
                <button class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('recommendationPanel').style.display='none'">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="recommendations-content">
                ${Array.isArray(recommendations) ? recommendations.map(rec => `
                    <div class="recommendation-item mb-3 p-3 border rounded">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="mb-0">${rec.title || '推荐项目'}</h6>
                            <span class="badge ${rec.priority === 'high' ? 'bg-danger' : rec.priority === 'medium' ? 'bg-warning' : 'bg-secondary'}">${rec.priority || 'normal'}</span>
                        </div>
                        <p class="text-muted mb-0" style="font-size: 0.9em;">${rec.description || '暂无描述'}</p>
                        <div class="mt-2">
                            <small class="text-muted">类型: ${rec.type || '通用'}</small>
                        </div>
                    </div>
                `).join('') : '<p class="text-muted">暂无推荐内容</p>'}
            </div>
            <div class="text-center mt-3">
                <button class="btn btn-primary btn-sm" onclick="window.intelligentRecommendation.generateRecommendations('currentUser')">
                    <i class="fas fa-refresh"></i> 刷新推荐
                </button>
            </div>
        `;

        panel.style.display = 'block';
    }
}

// 系统性能优化器
class SystemPerformanceOptimizer {
    constructor() {
        this.performanceMetrics = {
            pageLoadTime: 0,
            apiResponseTime: 0,
            memoryUsage: 0,
            domElements: 0
        };
        this.optimizationRules = [];
        this.init();
    }

    init() {
        this.startPerformanceMonitoring();
        this.setupOptimizationRules();
        console.log('系统性能优化器已初始化');
    }

    // 开始性能监控
    startPerformanceMonitoring() {
        // 监控页面加载时间
        window.addEventListener('load', () => {
            this.performanceMetrics.pageLoadTime = performance.now();
            this.checkPerformance();
        });

        // 定期检查性能指标
        setInterval(() => {
            this.updatePerformanceMetrics();
            this.checkPerformance();
        }, 30000); // 每30秒检查一次
    }

    // 更新性能指标
    updatePerformanceMetrics() {
        // 检查DOM元素数量
        this.performanceMetrics.domElements = document.querySelectorAll('*').length;
        
        // 检查内存使用（如果浏览器支持）
        if (performance.memory) {
            this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        }
    }

    // 设置优化规则
    setupOptimizationRules() {
        this.optimizationRules = [
            {
                name: 'DOM元素过多',
                condition: () => this.performanceMetrics.domElements > 1000,
                action: () => this.optimizeDOMElements()
            },
            {
                name: '内存使用过高',
                condition: () => this.performanceMetrics.memoryUsage > 100,
                action: () => this.optimizeMemoryUsage()
            },
            {
                name: '页面加载缓慢',
                condition: () => this.performanceMetrics.pageLoadTime > 3000,
                action: () => this.optimizePageLoad()
            }
        ];
    }

    // 检查性能并应用优化
    checkPerformance() {
        this.optimizationRules.forEach(rule => {
            if (rule.condition()) {
                console.warn(`性能问题检测: ${rule.name}`);
                rule.action();
            }
        });
    }

    // 优化DOM元素
    optimizeDOMElements() {
        // 移除不必要的元素
        const hiddenElements = document.querySelectorAll('[style*="display: none"]');
        hiddenElements.forEach(element => {
            if (!element.id || !element.id.includes('important')) {
                element.remove();
            }
        });

        // 清理空的文本节点
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (node.nodeValue.trim() === '') {
                textNodes.push(node);
            }
        }

        textNodes.forEach(node => node.remove());
        
        console.log('DOM元素优化完成');
    }

    // 优化内存使用
    optimizeMemoryUsage() {
        // 清理过期的事件监听器
        const elements = document.querySelectorAll('[data-temp-listener]');
        elements.forEach(element => {
            element.removeAttribute('data-temp-listener');
        });

        // 清理localStorage中的过期数据
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.includes('temp_') || key.includes('cache_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.expiry && new Date(data.expiry) < new Date()) {
                        localStorage.removeItem(key);
                    }
                } catch (error) {
                    // 忽略解析错误
                }
            }
        });

        console.log('内存使用优化完成');
    }

    // 优化页面加载
    optimizePageLoad() {
        // 延迟加载非关键图片
        const images = document.querySelectorAll('img:not([loading])');
        images.forEach(img => {
            img.loading = 'lazy';
        });

        // 压缩CSS
        const styleSheets = document.querySelectorAll('style');
        styleSheets.forEach(sheet => {
            if (sheet.innerHTML) {
                sheet.innerHTML = sheet.innerHTML.replace(/\s+/g, ' ').trim();
            }
        });

        console.log('页面加载优化完成');
    }

    // 获取性能报告
    getPerformanceReport() {
        return {
            metrics: this.performanceMetrics,
            timestamp: new Date().toISOString(),
            recommendations: this.getPerformanceRecommendations()
        };
    }

    // 获取性能建议
    getPerformanceRecommendations() {
        const recommendations = [];
        
        if (this.performanceMetrics.domElements > 800) {
            recommendations.push('建议减少DOM元素数量，考虑使用虚拟滚动或分页');
        }
        
        if (this.performanceMetrics.memoryUsage > 80) {
            recommendations.push('内存使用较高，建议清理不必要的数据和事件监听器');
        }
        
        if (this.performanceMetrics.pageLoadTime > 2000) {
            recommendations.push('页面加载时间较长，建议优化资源加载和代码执行');
        }

        return recommendations;
    }
}

// 全局系统集成管理器
class SystemIntegrationManager {
    constructor() {
        this.dataManager = new UnifiedDataManager();
        this.recommendationSystem = new IntelligentRecommendationSystem(this.dataManager);
        this.performanceOptimizer = new SystemPerformanceOptimizer();
        this.currentUserId = 'currentUser'; // 模拟当前用户ID
        this.init();
    }

    init() {
        this.setupGlobalEventListeners();
        this.initializeUserSession();
        this.createSystemIntegrationUI();
        console.log('系统集成管理器已初始化');
    }

    // 设置全局事件监听器
    setupGlobalEventListeners() {
        // 监听页面访问
        this.dataManager.recordBehavior(this.currentUserId, 'pageView', {
            page: window.location.pathname,
            timestamp: new Date().toISOString()
        });

        // 监听点击事件
        document.addEventListener('click', (event) => {
            if (event.target.tagName === 'BUTTON' || event.target.tagName === 'A') {
                this.dataManager.recordBehavior(this.currentUserId, 'click', {
                    element: event.target.tagName,
                    text: event.target.textContent.trim().substring(0, 50),
                    timestamp: new Date().toISOString()
                });
            }
        });

        // 监听AI交互
        this.dataManager.subscribe('aiInteraction', (data) => {
            this.dataManager.recordBehavior(this.currentUserId, 'aiInteraction', data);
        });
    }

    // 初始化用户会话
    initializeUserSession() {
        // 创建或更新用户画像
        const existingProfile = this.dataManager.getUserProfile(this.currentUserId);
        if (!existingProfile) {
            this.dataManager.updateUserProfile(this.currentUserId, {
                sessionStart: new Date().toISOString(),
                platform: navigator.platform,
                userAgent: navigator.userAgent.substring(0, 100)
            });
        } else {
            this.dataManager.updateUserProfile(this.currentUserId, {
                lastVisit: new Date().toISOString(),
                visitCount: (existingProfile.visitCount || 0) + 1
            });
        }
    }

    // 创建系统集成UI
    createSystemIntegrationUI() {
        // 创建系统状态面板
        const statusPanel = document.createElement('div');
        statusPanel.id = 'systemStatusPanel';
        statusPanel.className = 'position-fixed bg-white border rounded shadow-sm p-2';
        statusPanel.style.cssText = 'top: 10px; left: 10px; z-index: 1000; font-size: 0.8em; display: none;';
        statusPanel.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="status-indicator bg-success rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                <span>系统集成正常</span>
                <button class="btn btn-sm btn-outline-secondary ms-2" onclick="window.systemIntegration.showSystemPanel()">
                    <i class="fas fa-cog"></i>
                </button>
            </div>
        `;
        document.body.appendChild(statusPanel);

        // 创建快捷访问按钮
        const quickAccessBtn = document.createElement('button');
        quickAccessBtn.className = 'btn btn-primary position-fixed';
        quickAccessBtn.style.cssText = 'bottom: 80px; right: 20px; z-index: 999; border-radius: 50%; width: 50px; height: 50px;';
        quickAccessBtn.innerHTML = '<i class="fas fa-magic"></i>';
        quickAccessBtn.title = '智能推荐';
        quickAccessBtn.onclick = () => this.recommendationSystem.showRecommendationPanel(this.currentUserId);
        document.body.appendChild(quickAccessBtn);
    }

    // 显示系统面板
    showSystemPanel() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="fas fa-cogs"></i> 系统集成控制面板</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>用户画像</h6>
                                <div class="bg-light p-3 rounded mb-3">
                                    ${this.getUserProfileSummary()}
                                </div>
                            </div>
                            <div class="col-md-6">
                                <h6>系统性能</h6>
                                <div class="bg-light p-3 rounded mb-3">
                                    ${this.getPerformanceSummary()}
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-12">
                                <h6>数据统计</h6>
                                <div class="bg-light p-3 rounded">
                                    ${this.getDataStatistics()}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" onclick="window.systemIntegration.recommendationSystem.generateRecommendations('${this.currentUserId}')">
                            生成推荐
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    // 获取用户画像摘要
    getUserProfileSummary() {
        const profile = this.dataManager.getUserProfile(this.currentUserId);
        if (!profile) return '<p class="text-muted">暂无用户数据</p>';

        return `
            <div><strong>活跃度:</strong> ${profile.activityLevel || 0}</div>
            <div><strong>AI交互:</strong> ${profile.aiEngagement || 0} 次</div>
            <div><strong>访问次数:</strong> ${profile.visitCount || 1}</div>
            <div><strong>最后访问:</strong> ${profile.lastVisit ? new Date(profile.lastVisit).toLocaleString() : '首次访问'}</div>
        `;
    }

    // 获取性能摘要
    getPerformanceSummary() {
        const report = this.performanceOptimizer.getPerformanceReport();
        return `
            <div><strong>DOM元素:</strong> ${report.metrics.domElements}</div>
            <div><strong>内存使用:</strong> ${report.metrics.memoryUsage.toFixed(2)} MB</div>
            <div><strong>页面加载:</strong> ${report.metrics.pageLoadTime.toFixed(0)} ms</div>
            <div class="mt-2">
                ${report.recommendations.length > 0 ? 
                    '<strong>建议:</strong><br>' + report.recommendations.join('<br>') : 
                    '<span class="text-success">性能良好</span>'
                }
            </div>
        `;
    }

    // 获取数据统计
    getDataStatistics() {
        const userProfiles = Object.keys(this.dataManager.dataStore.userProfiles).length;
        const crossModuleData = Object.keys(this.dataManager.dataStore.crossModuleData).length;
        const behaviorRecords = Object.values(this.dataManager.dataStore.behaviorData)
            .reduce((total, behaviors) => total + behaviors.length, 0);

        return `
            <div class="row text-center">
                <div class="col-4">
                    <div class="h4">${userProfiles}</div>
                    <div class="text-muted">用户画像</div>
                </div>
                <div class="col-4">
                    <div class="h4">${crossModuleData}</div>
                    <div class="text-muted">跨模块数据</div>
                </div>
                <div class="col-4">
                    <div class="h4">${behaviorRecords}</div>
                    <div class="text-muted">行为记录</div>
                </div>
            </div>
        `;
    }
}

// 初始化系统集成
document.addEventListener('DOMContentLoaded', function() {
    window.systemIntegration = new SystemIntegrationManager();
    window.unifiedDataManager = window.systemIntegration.dataManager;
    window.intelligentRecommendation = window.systemIntegration.recommendationSystem;
    window.performanceOptimizer = window.systemIntegration.performanceOptimizer;
    
    console.log('系统集成模块已加载完成');
});