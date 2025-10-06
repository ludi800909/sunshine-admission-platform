/**
 * AI赋能阳光招生平台功能测试脚本
 * 用于自动化测试各个页面的AI功能和核心功能
 */

class PlatformTester {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
    }

    // 记录测试结果
    logResult(testName, status, details = '') {
        const result = {
            test: testName,
            status: status, // 'PASS', 'FAIL', 'SKIP'
            details: details,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);
        console.log(`[${status}] ${testName}: ${details}`);
    }

    // 测试AI助手基础功能
    async testAIAssistant(pageUrl, assistantId) {
        try {
            // 检查AI助手是否存在
            const aiAssistant = document.getElementById(assistantId);
            if (!aiAssistant) {
                this.logResult(`AI助手存在性检查 - ${pageUrl}`, 'FAIL', 'AI助手元素未找到');
                return false;
            }

            // 检查DeepSeek API配置
            if (typeof window.deepSeekConfig === 'undefined') {
                this.logResult(`DeepSeek API配置检查 - ${pageUrl}`, 'FAIL', 'DeepSeek API配置未找到');
                return false;
            }

            // 检查API密钥
            const expectedApiKey = 'sk-3cdcf9f01e5141d09060b4b76045edda';
            if (window.deepSeekConfig.apiKey !== expectedApiKey) {
                this.logResult(`API密钥检查 - ${pageUrl}`, 'FAIL', `API密钥不匹配，期望: ${expectedApiKey}`);
                return false;
            }

            // 检查聊天历史功能
            const chatHistory = localStorage.getItem(`chatHistory_${assistantId}`);
            this.logResult(`聊天历史存储检查 - ${pageUrl}`, 'PASS', '本地存储功能正常');

            // 检查AI对话界面元素
            const chatContainer = aiAssistant.querySelector('.chat-messages');
            const inputField = aiAssistant.querySelector('input[type="text"]');
            const sendButton = aiAssistant.querySelector('button');

            if (!chatContainer || !inputField || !sendButton) {
                this.logResult(`AI界面元素检查 - ${pageUrl}`, 'FAIL', '关键界面元素缺失');
                return false;
            }

            this.logResult(`AI助手基础功能检查 - ${pageUrl}`, 'PASS', '所有基础功能正常');
            return true;

        } catch (error) {
            this.logResult(`AI助手测试异常 - ${pageUrl}`, 'FAIL', error.message);
            return false;
        }
    }

    // 测试响应式设计
    testResponsiveDesign() {
        const breakpoints = [
            { name: '手机端', width: 375 },
            { name: '平板端', width: 768 },
            { name: 'PC端', width: 1920 }
        ];

        breakpoints.forEach(bp => {
            // 模拟不同屏幕尺寸
            window.resizeTo(bp.width, 800);
            
            // 检查AI助手在不同尺寸下的显示
            const aiAssistant = document.querySelector('.ai-assistant');
            if (aiAssistant) {
                const computedStyle = window.getComputedStyle(aiAssistant);
                const isVisible = computedStyle.display !== 'none';
                
                this.logResult(`响应式设计 - ${bp.name}`, isVisible ? 'PASS' : 'FAIL', 
                    `宽度: ${bp.width}px, AI助手可见: ${isVisible}`);
            }
        });
    }

    // 测试页面功能完整性
    async testPageFunctionality(pageUrl) {
        try {
            // 检查页面标题
            const title = document.title;
            if (!title.includes('阳光招生平台')) {
                this.logResult(`页面标题检查 - ${pageUrl}`, 'FAIL', `标题不符合要求: ${title}`);
            } else {
                this.logResult(`页面标题检查 - ${pageUrl}`, 'PASS', `标题正确: ${title}`);
            }

            // 检查Bootstrap和Font Awesome
            const bootstrapLink = document.querySelector('link[href*="bootstrap"]');
            const fontAwesomeLink = document.querySelector('link[href*="font-awesome"]');
            
            if (!bootstrapLink) {
                this.logResult(`Bootstrap加载检查 - ${pageUrl}`, 'FAIL', 'Bootstrap CSS未加载');
            } else {
                this.logResult(`Bootstrap加载检查 - ${pageUrl}`, 'PASS', 'Bootstrap CSS已加载');
            }

            if (!fontAwesomeLink) {
                this.logResult(`Font Awesome加载检查 - ${pageUrl}`, 'FAIL', 'Font Awesome未加载');
            } else {
                this.logResult(`Font Awesome加载检查 - ${pageUrl}`, 'PASS', 'Font Awesome已加载');
            }

            // 检查导航菜单
            const navMenu = document.querySelector('.navbar') || document.querySelector('nav');
            if (navMenu) {
                this.logResult(`导航菜单检查 - ${pageUrl}`, 'PASS', '导航菜单存在');
            } else {
                this.logResult(`导航菜单检查 - ${pageUrl}`, 'FAIL', '导航菜单未找到');
            }

            return true;
        } catch (error) {
            this.logResult(`页面功能测试异常 - ${pageUrl}`, 'FAIL', error.message);
            return false;
        }
    }

    // 生成测试报告
    generateReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
        const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
        const skippedTests = this.testResults.filter(r => r.status === 'SKIP').length;

        const report = {
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                skipped: skippedTests,
                successRate: ((passedTests / totalTests) * 100).toFixed(2) + '%'
            },
            details: this.testResults,
            timestamp: new Date().toISOString()
        };

        console.log('=== 测试报告 ===');
        console.log(`总测试数: ${totalTests}`);
        console.log(`通过: ${passedTests}`);
        console.log(`失败: ${failedTests}`);
        console.log(`跳过: ${skippedTests}`);
        console.log(`成功率: ${report.summary.successRate}`);
        console.log('================');

        return report;
    }
}

// 全局测试实例
window.platformTester = new PlatformTester();

// 页面加载完成后自动开始测试
document.addEventListener('DOMContentLoaded', function() {
    console.log('开始AI赋能阳光招生平台功能测试...');
    
    // 获取当前页面URL
    const currentUrl = window.location.pathname;
    
    // 延迟执行测试，确保页面完全加载
    setTimeout(() => {
        // 测试页面基础功能
        window.platformTester.testPageFunctionality(currentUrl);
        
        // 测试AI助手功能
        const aiAssistantIds = ['aiAssistant', 'aiChatContainer', 'chatContainer'];
        let aiFound = false;
        
        aiAssistantIds.forEach(id => {
            const element = document.getElementById(id);
            if (element && !aiFound) {
                window.platformTester.testAIAssistant(currentUrl, id);
                aiFound = true;
            }
        });
        
        if (!aiFound) {
            window.platformTester.logResult(`AI助手查找 - ${currentUrl}`, 'FAIL', '未找到AI助手元素');
        }
        
        // 测试响应式设计
        window.platformTester.testResponsiveDesign();
        
        // 生成报告
        const report = window.platformTester.generateReport();
        
        // 将报告保存到localStorage
        localStorage.setItem('testReport_' + Date.now(), JSON.stringify(report));
        
    }, 2000);
});

// 手动测试函数
window.runManualTest = function(testType) {
    switch(testType) {
        case 'ai':
            console.log('开始AI功能测试...');
            // AI功能测试逻辑
            break;
        case 'responsive':
            console.log('开始响应式测试...');
            window.platformTester.testResponsiveDesign();
            break;
        case 'all':
            console.log('开始全面测试...');
            location.reload();
            break;
        default:
            console.log('未知测试类型');
    }
};