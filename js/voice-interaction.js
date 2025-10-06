/**
 * 语音交互核心功能模块
 * 支持语音输入、语音输出、多语言、设置管理
 */

class VoiceInteractionManager {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        this.settings = this.loadSettings();
        this.voices = [];
        this.retryCount = 0;
        this.maxRetries = 3;
        this.speechQueue = [];
        this.isProcessingQueue = false;
        this.networkCheckInterval = null;
        this.supportsSpeechRecognition = false;
        this.supportsSpeechSynthesis = false;
        this.currentUtterance = null;
        this.lastErrorMessage = '';
        this.lastErrorTime = 0;
        this.init();
    }

    // 初始化语音功能
    init() {
        this.checkBrowserSupport();
        this.initSpeechRecognition();
        this.initSpeechSynthesis();
        this.setupEventListeners();
        this.createVoiceUI();
    }

    // 检查浏览器支持
    checkBrowserSupport() {
        this.supportsSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        this.supportsSpeechSynthesis = 'speechSynthesis' in window;
        
        if (!this.supportsSpeechRecognition) {
            console.warn('浏览器不支持语音识别功能');
            this.showVoiceError('您的浏览器不支持语音识别功能，请使用Chrome、Edge或Safari浏览器');
        }
        
        if (!this.supportsSpeechSynthesis) {
            console.warn('浏览器不支持语音合成功能');
            this.showVoiceError('您的浏览器不支持语音播放功能');
        }
    }



    // 初始化语音识别
    initSpeechRecognition() {
        if (!this.supportsSpeechRecognition) return;
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = this.settings.language;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.retryCount = 0;
            this.updateVoiceStatus('listening');
            console.log('语音识别已启动');
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                this.handleVoiceInput(finalTranscript);
            } else if (interimTranscript) {
                this.updateInterimResult(interimTranscript);
            }
        };

        this.recognition.onerror = (event) => {
            // 只对关键错误输出日志，静默处理常见的非关键错误
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.error('语音识别错误:', event.error);
            }
            this.isListening = false;
            this.handleRecognitionError(event.error);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateVoiceStatus('idle');
            // 减少日志输出，只在调试时需要
            // console.log('语音识别已结束');
        };
    }

    // 检测网络连接状态
    checkNetworkConnection() {
        // 使用navigator.onLine作为主要检测方法，避免网络请求
        if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
            return Promise.resolve(navigator.onLine);
        }
        
        // 降级方案：简单返回true，避免阻塞语音功能
        return Promise.resolve(true);
    }

    // 处理语音识别错误
    async handleRecognitionError(error) {
        let errorMessage = '';
        let shouldRetry = false;
        let showFallback = false;
        
        // 网络错误时先检测网络状态
        if (error === 'network') {
            const isNetworkAvailable = await this.checkNetworkConnection();
            
            if (!isNetworkAvailable) {
                // 真正的网络连接问题
                errorMessage = '网络连接中断，请检查网络连接';
                shouldRetry = false;
                showFallback = true;
            } else {
                // 网络正常但语音服务不可用
                if (this.retryCount < 1) { // 减少重试次数
                    errorMessage = '语音服务暂时不可用，正在重试...';
                    shouldRetry = true;
                } else {
                    errorMessage = '语音识别服务不稳定，建议使用文字输入';
                    shouldRetry = false;
                    showFallback = true;
                }
            }
        } else {
            // 处理其他类型的错误
            switch (error) {
                case 'not-allowed':
                    errorMessage = '请允许浏览器访问麦克风权限';
                    shouldRetry = false;
                    showFallback = true;
                    break;
                case 'no-speech':
                    // 无语音检测 - 完全静默处理
                    this.updateVoiceStatus('idle');
                    return;
                case 'audio-capture':
                    errorMessage = '麦克风访问失败，请检查设备连接';
                    shouldRetry = false;
                    showFallback = true;
                    break;
                case 'service-not-allowed':
                    errorMessage = '语音识别服务不可用';
                    shouldRetry = false;
                    showFallback = true;
                    break;
                case 'aborted':
                    // 用户主动停止，完全静默处理
                    this.updateVoiceStatus('idle');
                    return;
                default:
                    errorMessage = `语音识别出现问题: ${error}`;
                    shouldRetry = this.retryCount < 1; // 减少其他错误的重试次数
                    showFallback = !shouldRetry;
            }
        }
        
        // 更新状态为错误
        this.updateVoiceStatus('error');
        
        // 优化重试逻辑
        if (shouldRetry && this.retryCount < 1) { // 最多重试1次
            this.retryCount++;
            const retryDelay = 3000; // 增加延迟到3秒
            
            // 减少日志输出，只在必要时记录
            if (error === 'network') {
                console.log(`语音服务重试中...`);
            }
            
            setTimeout(() => {
                if (this.supportsSpeechRecognition) {
                    this.startListening();
                }
            }, retryDelay);
        } else {
            // 显示错误消息和降级方案
            if (errorMessage) {
                this.showVoiceError(errorMessage, showFallback);
            }
            // 重置重试计数
            this.retryCount = 0;
            this.updateVoiceStatus('idle');
        }
    }

    // 初始化语音合成
    initSpeechSynthesis() {
        if (!this.supportsSpeechSynthesis) return;
        
        // 加载可用语音
        this.loadVoices();
        
        // 监听语音变化
        this.synthesis.onvoiceschanged = () => {
            this.loadVoices();
        };
    }

    // 加载可用语音
    loadVoices() {
        if (!this.supportsSpeechSynthesis) return;
        this.voices = this.synthesis.getVoices();
        this.updateVoiceOptions();
    }

    // 加载设置
    loadSettings() {
        const defaultSettings = {
            language: 'zh-CN',
            voiceRate: 1.0,
            voiceVolume: 1.0,
            voicePitch: 1.0,
            autoSpeak: true,
            preferredVoice: null,
            enableRetry: true,
            maxRetries: 3
        };

        const saved = localStorage.getItem('voiceSettings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    // 保存设置
    saveSettings() {
        localStorage.setItem('voiceSettings', JSON.stringify(this.settings));
    }

    // 开始语音识别
    startListening() {
        if (!this.supportsSpeechRecognition) {
            this.showVoiceError('您的浏览器不支持语音识别功能');
            return;
        }

        // 检查是否已在监听
        if (this.isListening) {
            console.log('语音识别已在进行中');
            return;
        }

        // 检查识别器状态
        if (!this.recognition) {
            console.error('语音识别器未初始化');
            this.showVoiceError('语音识别功能初始化失败');
            return;
        }

        try {
            // 重置状态
            this.retryCount = 0;
            
            console.log('启动语音识别...');
            
            // 启动识别
            this.recognition.start();
            
        } catch (error) {
            console.error('启动语音识别失败:', error);
            
            // 根据错误类型提供具体的错误信息
            let errorMessage = '语音识别启动失败';
            if (error.name === 'InvalidStateError') {
                errorMessage = '语音识别正在运行中，请稍后重试';
            } else if (error.name === 'NotAllowedError') {
                errorMessage = '请允许浏览器访问麦克风权限';
            } else if (error.name === 'ServiceNotAllowedError') {
                errorMessage = '语音识别服务不可用';
            }
            
            this.updateVoiceStatus('error');
            this.showVoiceError(errorMessage);
        }
    }

    // 停止语音识别
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    // 语音合成队列管理
    speak(text) {
        if (!this.supportsSpeechSynthesis || !text) {
            console.warn('语音合成不可用或文本为空');
            return;
        }

        // 清理之前的播放状态，避免冲突
        if (this.isSpeaking) {
            this.synthesis.cancel();
            this.resetSpeechState();
        }

        // 添加到队列
        this.speechQueue.push(text);
        this.processSpeechQueue();
    }

    // 重置语音状态
    resetSpeechState() {
        this.isSpeaking = false;
        this.isProcessingQueue = false;
        this.currentUtterance = null;
    }

    // 处理语音合成队列
    processSpeechQueue() {
        if (this.isProcessingQueue || this.speechQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;
        const text = this.speechQueue.shift();
        
        // 确保语音合成器处于空闲状态
        if (this.synthesis.speaking || this.synthesis.pending) {
            this.synthesis.cancel();
            // 等待取消完成后再继续
            setTimeout(() => {
                this.processSpeechQueue();
            }, 100);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance = utterance;
        
        // 设置语音参数
        utterance.rate = this.settings.voiceRate;
        utterance.volume = this.settings.voiceVolume;
        utterance.pitch = this.settings.voicePitch;
        utterance.lang = this.settings.language;

        // 选择语音
        if (this.settings.preferredVoice) {
            const voice = this.voices.find(v => v.name === this.settings.preferredVoice);
            if (voice) {
                utterance.voice = voice;
            }
        }

        utterance.onstart = () => {
            this.isSpeaking = true;
            this.updateVoiceStatus('speaking');
            console.log('语音播放开始:', text.substring(0, 50) + '...');
        };

        utterance.onend = () => {
            console.log('语音播放正常结束');
            this.resetSpeechState();
            this.updateVoiceStatus('idle');
            
            // 处理队列中的下一个
            setTimeout(() => {
                this.processSpeechQueue();
            }, 50);
        };

        utterance.onerror = (event) => {
            console.warn('语音合成事件:', event.error, '- 文本:', text.substring(0, 30));
            this.resetSpeechState();
            
            // 只对真正的错误进行处理，忽略正常的中断
            if (event.error !== 'interrupted' && event.error !== 'canceled') {
                this.handleSynthesisError(event.error);
            } else {
                // 对于中断和取消，直接继续处理队列
                console.log('语音播放被中断或取消，继续处理队列');
            }
            
            // 继续处理队列
            setTimeout(() => {
                this.processSpeechQueue();
            }, 100);
        };

        // 添加暂停和恢复事件处理
        utterance.onpause = () => {
            console.log('语音播放暂停');
        };

        utterance.onresume = () => {
            console.log('语音播放恢复');
        };

        try {
            // 检查语音合成器状态
            if (!this.synthesis) {
                throw new Error('语音合成器不可用');
            }
            
            this.synthesis.speak(utterance);
            
            // 设置超时保护，防止卡死
            setTimeout(() => {
                if (this.currentUtterance === utterance && this.isProcessingQueue) {
                    console.warn('语音播放超时，强制重置状态');
                    this.resetSpeechState();
                    this.updateVoiceStatus('idle');
                    this.processSpeechQueue();
                }
            }, 10000); // 10秒超时
            
        } catch (error) {
            console.error('语音播放失败:', error);
            this.resetSpeechState();
            this.updateVoiceStatus('error');
            this.showVoiceError('语音播放失败，请重试');
        }
    }

    // 处理语音合成错误
    handleSynthesisError(error) {
        let errorMessage = '';
        
        switch (error) {
            case 'interrupted':
                errorMessage = '语音播放被中断';
                break;
            case 'canceled':
                errorMessage = '语音播放被取消';
                break;
            case 'not-allowed':
                errorMessage = '语音播放权限被拒绝';
                break;
            case 'network':
                errorMessage = '网络问题导致语音播放失败';
                break;
            default:
                errorMessage = `语音播放出现问题: ${error}`;
        }
        
        this.updateVoiceStatus('error');
        
        // 对于某些错误，不显示提示（如用户主动中断）
        if (error !== 'interrupted' && error !== 'canceled') {
            this.showVoiceError(errorMessage);
        }
    }

    // 停止语音播放
    stopSpeaking() {
        if (this.synthesis) {
            console.log('停止语音播放');
            this.synthesis.cancel();
            this.speechQueue = []; // 清空队列
            this.resetSpeechState(); // 使用统一的状态重置方法
            this.updateVoiceStatus('idle');
        }
    }

    // 处理语音输入
    handleVoiceInput(text) {
        console.log('语音输入:', text);
        
        // 将语音输入填入当前活跃的聊天输入框
        const activeChat = document.querySelector('.ai-chat-panel:not(.d-none)');
        if (activeChat) {
            const input = activeChat.querySelector('.chat-input') || activeChat.querySelector('#aiInput');
            if (input) {
                input.value = text;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                
                // 自动发送消息（可选）
                if (this.settings.autoSend) {
                    const sendBtn = activeChat.querySelector('.send-btn') || activeChat.querySelector('#aiSendBtn');
                    if (sendBtn) {
                        sendBtn.click();
                    }
                }
            }
        }
    }

    // 更新语音状态
    updateVoiceStatus(status) {
        // 更新状态指示器
        const statusIndicators = document.querySelectorAll('.voice-status-indicator');
        statusIndicators.forEach(indicator => {
            indicator.className = 'voice-status-indicator';
            
            switch (status) {
                case 'listening':
                    indicator.classList.add('listening');
                    indicator.title = '正在听取语音...';
                    break;
                case 'speaking':
                    indicator.classList.add('speaking');
                    indicator.title = '正在播放语音...';
                    break;
                case 'error':
                    indicator.classList.add('error');
                    indicator.title = '语音功能出错';
                    break;
                default:
                    indicator.classList.add('idle');
                    indicator.title = '语音功能就绪';
            }
        });

        // 更新语音按钮状态
        this.updateVoiceButtonStates(status);

        // 更新输入框提示
        const activeChat = document.querySelector('.ai-chat-panel:not(.d-none)');
        if (activeChat) {
            const input = activeChat.querySelector('.chat-input') || activeChat.querySelector('#aiInput');
            if (input) {
                switch (status) {
                    case 'listening':
                        input.placeholder = '正在识别语音...';
                        break;
                    case 'speaking':
                        input.placeholder = '正在播放语音...';
                        break;
                    case 'error':
                        input.placeholder = '语音功能出错，请重试';
                        break;
                    default:
                        input.placeholder = '请输入您的问题...';
                }
            }
        }

        // 触发状态变化事件
        document.dispatchEvent(new CustomEvent('voiceStatusChanged', {
            detail: { 
                status: status
            }
        }));
    }

    // 更新语音按钮状态
    updateVoiceButtonStates(status) {
        const voiceInputBtns = document.querySelectorAll('.voice-input-btn, #voiceInputBtn');
        const voiceOutputBtns = document.querySelectorAll('.voice-output-btn, #voiceOutputBtn');
        
        voiceInputBtns.forEach(btn => {
            btn.classList.remove('btn-danger', 'btn-success', 'btn-warning');
            
            switch (status) {
                case 'listening':
                    btn.classList.add('btn-danger');
                    btn.innerHTML = '<i class="fas fa-stop"></i>';
                    btn.title = '停止录音';
                    break;
                case 'error':
                    btn.classList.add('btn-warning');
                    btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                    btn.title = '语音识别出错';
                    break;
                default:
                    btn.classList.add('btn-outline-primary');
                    btn.innerHTML = '<i class="fas fa-microphone"></i>';
                    btn.title = '开始语音输入';
            }
        });

        voiceOutputBtns.forEach(btn => {
            btn.classList.remove('btn-danger', 'btn-success', 'btn-warning');
            
            switch (status) {
                case 'speaking':
                    btn.classList.add('btn-danger');
                    btn.innerHTML = '<i class="fas fa-stop"></i>';
                    btn.title = '停止播放';
                    break;
                case 'error':
                    btn.classList.add('btn-warning');
                    btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
                    btn.title = '语音播放出错';
                    break;
                default:
                    btn.classList.add('btn-outline-secondary');
                    btn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    btn.title = '语音播放';
            }
        });
    }

    // 更新临时识别结果
    updateInterimResult(text) {
        const activeChat = document.querySelector('.ai-chat-panel:not(.d-none)');
        if (activeChat && text) {
            const input = activeChat.querySelector('.chat-input');
            if (input) {
                input.placeholder = '正在识别: ' + text;
            }
        }
    }

    // 显示语音错误
    showVoiceError(message, showFallback = false) {
        // 减少控制台日志噪音 - 只记录重要错误
        if (message.includes('网络') || message.includes('权限') || message.includes('不支持')) {
            console.warn('语音错误:', message);
        } else {
            console.log('语音提示:', message);
        }
        
        // 防止重复显示相同错误
        if (this.lastErrorMessage === message && Date.now() - this.lastErrorTime < 5000) {
            return;
        }
        this.lastErrorMessage = message;
        this.lastErrorTime = Date.now();
        
        // 创建临时提示
        const toast = document.createElement('div');
        toast.className = 'toast position-fixed top-0 end-0 m-3';
        toast.style.zIndex = '9999';
        
        // 根据是否显示降级方案调整内容
        let fallbackContent = '';
        if (showFallback) {
            fallbackContent = `
                <div class="mt-2 pt-2 border-top">
                    <small class="text-muted">
                        <i class="fas fa-lightbulb me-1"></i>
                        建议：您可以直接在输入框中输入文字与AI对话
                    </small>
                </div>
            `;
        }
        
        toast.innerHTML = `
            <div class="toast-header bg-info text-white">
                <i class="fas fa-microphone me-2"></i>
                <strong class="me-auto">语音助手</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="关闭"></button>
            </div>
            <div class="toast-body">
                <div class="d-flex align-items-center">
                    <i class="fas fa-info-circle me-2 text-info"></i>
                    <span>${message}</span>
                </div>
                ${fallbackContent}
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // 使用Bootstrap Toast或降级处理
        if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
            const bsToast = new bootstrap.Toast(toast, {
                autohide: true,
                delay: 4000 // 缩短显示时间
            });
            bsToast.show();
        } else {
            // 降级处理：简单显示和隐藏
            toast.style.display = 'block';
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 4000);
        }
        
        // 自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 6000);
    }

    // 获取支持信息
    getSupportInfo() {
        const supportInfo = [];
        
        if (!this.supportsSpeechRecognition) {
            supportInfo.push('语音识别不支持');
        }
        
        if (!this.supportsSpeechSynthesis) {
            supportInfo.push('语音播放不支持');
        }
        
        if (!navigator.onLine) {
            supportInfo.push('网络连接异常');
        }
        
        return supportInfo.length > 0 
            ? `当前状态: ${supportInfo.join(', ')}` 
            : '建议使用Chrome、Edge或Safari浏览器获得最佳体验';
    }

    // 设置事件监听器
    setupEventListeners() {
        // 监听AI响应，自动播放语音
        document.addEventListener('aiResponse', (event) => {
            if (this.settings.autoSpeak && event.detail && event.detail.response) {
                this.speak(event.detail.response);
            }
        });
    }

    // 创建语音交互UI
    createVoiceUI() {
        // 为每个AI聊天面板添加语音按钮
        const chatPanels = document.querySelectorAll('.ai-chat-panel, #aiAssistant');
        chatPanels.forEach(panel => {
            this.addVoiceButtonsToPanel(panel);
        });

        // 创建语音设置面板
        this.createVoiceSettings();
    }

    // 为聊天面板添加语音按钮
    addVoiceButtonsToPanel(panel) {
        const inputGroup = panel.querySelector('.input-group');
        if (inputGroup && !inputGroup.querySelector('.voice-btn')) {
            // 语音输入按钮
            const voiceInputBtn = document.createElement('button');
            voiceInputBtn.className = 'btn btn-outline-primary voice-btn voice-input-btn';
            voiceInputBtn.type = 'button';
            voiceInputBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            voiceInputBtn.title = '语音输入';
            
            voiceInputBtn.addEventListener('click', () => {
                if (this.isListening) {
                    this.stopListening();
                } else {
                    this.startListening();
                }
            });

            // 语音输出控制按钮
            const voiceOutputBtn = document.createElement('button');
            voiceOutputBtn.className = 'btn btn-outline-secondary voice-btn voice-output-btn';
            voiceOutputBtn.type = 'button';
            voiceOutputBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            voiceOutputBtn.title = '语音播放控制';
            
            voiceOutputBtn.addEventListener('click', () => {
                if (this.isSpeaking) {
                    this.stopSpeaking();
                } else {
                    // 播放最后一条AI消息
                    const lastAiMessage = panel.querySelector('.ai-message.assistant:last-child');
                    if (lastAiMessage) {
                        const text = lastAiMessage.textContent.trim();
                        this.speak(text);
                    }
                }
            });

            // 语音设置按钮
            const voiceSettingsBtn = document.createElement('button');
            voiceSettingsBtn.className = 'btn btn-outline-info voice-btn voice-settings-btn';
            voiceSettingsBtn.type = 'button';
            voiceSettingsBtn.innerHTML = '<i class="fas fa-cog"></i>';
            voiceSettingsBtn.title = '语音设置';
            
            voiceSettingsBtn.addEventListener('click', () => {
                this.showVoiceSettings();
            });

            // 状态指示器
            const statusIndicator = document.createElement('span');
            statusIndicator.className = 'voice-status-indicator idle ms-2';
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i>';

            // 插入按钮
            inputGroup.appendChild(voiceInputBtn);
            inputGroup.appendChild(voiceOutputBtn);
            inputGroup.appendChild(voiceSettingsBtn);
            inputGroup.appendChild(statusIndicator);
        }
    }

    // 创建语音设置面板
    createVoiceSettings() {
        const settingsModal = document.createElement('div');
        settingsModal.className = 'modal fade';
        settingsModal.id = 'voiceSettingsModal';
        settingsModal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">语音设置</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">语言选择</label>
                            <select class="form-select" id="voiceLanguage">
                                <option value="zh-CN">中文（普通话）</option>
                                <option value="en-US">English (US)</option>
                                <option value="en-GB">English (UK)</option>
                                <option value="ja-JP">日本語</option>
                                <option value="ko-KR">한국어</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">语音速度: <span id="rateValue">1.0</span></label>
                            <input type="range" class="form-range" id="voiceRate" min="0.5" max="2" step="0.1" value="1">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">语音音量: <span id="volumeValue">1.0</span></label>
                            <input type="range" class="form-range" id="voiceVolume" min="0" max="1" step="0.1" value="1">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">语音音调: <span id="pitchValue">1.0</span></label>
                            <input type="range" class="form-range" id="voicePitch" min="0" max="2" step="0.1" value="1">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">首选语音</label>
                            <select class="form-select" id="preferredVoice">
                                <option value="">系统默认</option>
                            </select>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="autoSpeak">
                            <label class="form-check-label" for="autoSpeak">
                                自动播放AI回复
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="autoSend">
                            <label class="form-check-label" for="autoSend">
                                语音输入后自动发送
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="saveVoiceSettings">保存设置</button>
                        <button type="button" class="btn btn-info" id="testVoice">测试语音</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(settingsModal);
        this.setupSettingsEventListeners();
        this.loadSettingsToUI();
    }

    // 设置面板事件监听器
    setupSettingsEventListeners() {
        // 保存设置
        document.getElementById('saveVoiceSettings').addEventListener('click', () => {
            this.saveSettingsFromUI();
            const modal = bootstrap.Modal.getInstance(document.getElementById('voiceSettingsModal'));
            modal.hide();
        });

        // 测试语音
        document.getElementById('testVoice').addEventListener('click', () => {
            this.speak('这是语音测试，您好！');
        });

        // 实时更新滑块值显示
        ['voiceRate', 'voiceVolume', 'voicePitch'].forEach(id => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(id.replace('voice', '').toLowerCase() + 'Value');
            
            slider.addEventListener('input', () => {
                valueSpan.textContent = slider.value;
            });
        });
    }

    // 从UI保存设置
    saveSettingsFromUI() {
        this.settings = {
            language: document.getElementById('voiceLanguage').value,
            voiceRate: parseFloat(document.getElementById('voiceRate').value),
            voiceVolume: parseFloat(document.getElementById('voiceVolume').value),
            voicePitch: parseFloat(document.getElementById('voicePitch').value),
            autoSpeak: document.getElementById('autoSpeak').checked,
            preferredVoice: document.getElementById('preferredVoice').value || null
        };

        this.saveSettings();
        
        // 更新语音识别语言
        if (this.recognition) {
            this.recognition.lang = this.settings.language;
        }
    }

    // 加载设置到UI
    loadSettingsToUI() {
        document.getElementById('voiceLanguage').value = this.settings.language;
        document.getElementById('voiceRate').value = this.settings.voiceRate;
        document.getElementById('voiceVolume').value = this.settings.voiceVolume;
        document.getElementById('voicePitch').value = this.settings.voicePitch;
        document.getElementById('autoSpeak').checked = this.settings.autoSpeak;
        
        // 更新显示值
        document.getElementById('rateValue').textContent = this.settings.voiceRate;
        document.getElementById('volumeValue').textContent = this.settings.voiceVolume;
        document.getElementById('pitchValue').textContent = this.settings.voicePitch;
    }

    // 更新语音选项
    updateVoiceOptions() {
        const select = document.getElementById('preferredVoice');
        if (select) {
            select.innerHTML = '<option value="">系统默认</option>';
            
            this.voices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = `${voice.name} (${voice.lang})`;
                if (voice.name === this.settings.preferredVoice) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
    }

    // 显示语音设置
    showVoiceSettings() {
        const modal = new bootstrap.Modal(document.getElementById('voiceSettingsModal'));
        modal.show();
    }
}

// 全局实例
window.VoiceInteractionManager = VoiceInteractionManager;