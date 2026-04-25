/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  RotateCcw, 
  Download, 
  Maximize2, 
  Minimize2, 
  Ratio, 
  AlertCircle,
  Loader2,
  ChevronRight,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { UploadZone } from './components/UploadZone';
import { cn } from './lib/utils';

// Types
type AspectRatio = '9:16' | '16:9';

export default function App() {
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'veo3'>('design');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVEO3, setIsGeneratingVEO3] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [veo3Prompt, setVeo3Prompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const loadingMessages = [
    "Đang phân tích vóc dáng người mẫu...",
    "Đang trích xuất chi tiết trang phục...",
    "Đang thực hiện ghép Virtual Try-On...",
    "Đang điều chỉnh ánh sáng và phụ kiện...",
    "Đang hoàn thiện chất lượng ảnh Studio..."
  ];

  const [veo3UserRequest, setVeo3UserRequest] = useState('');

  const handleGenerate = async () => {
    const geminiKey = apiKey.trim() || process.env.GEMINI_API_KEY;
    
    if (!geminiKey) {
      setError("Vui lòng nhập Gemini API Key của bạn để bắt đầu.");
      return;
    }
    
    if (!modelImage || !garmentImage) {
      setError("Vui lòng tải lên cả ảnh người mẫu và ảnh trang phục.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResultImage(null);
    setLoadingStep(0);

    // Kéo dài thời gian hiển thị message để người dùng yên tâm
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
    }, 4000);

    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const getBase64Data = (base64: string) => base64.split(',')[1];
      const getMimeType = (base64: string) => base64.split(',')[0].split(':')[1].split(';')[0];

      const modelPart = {
        inlineData: {
          data: getBase64Data(modelImage),
          mimeType: getMimeType(modelImage),
        },
      };

      const garmentPart = {
        inlineData: {
          data: getBase64Data(garmentImage),
          mimeType: getMimeType(garmentImage),
        },
      };

      const promptPart = {
        text: `Bạn là một chuyên gia chỉnh sửa ảnh thời trang chuyên nghiệp. 
        Hãy thực hiện "Virtual Try-On": 
        Ghép chính xác bộ trang phục từ hình ảnh thứ hai lên người mẫu ở hình ảnh thứ nhất.
        
        Yêu cầu quan trọng:
        1. GIỮ NGUYÊN khuôn mặt, vóc dáng, màu da và tư thế của người mẫu từ ảnh 1.
        2. Trang phục từ ảnh 2 phải được đặt lên người mẫu một cách hoàn hảo, vừa vặn với tư thế hiện có.
        3. TỰ ĐỘNG PHỐI ĐỒ: Hãy thêm các phụ kiện phù hợp như giày, túi xách, mũ hoặc kính mắt có phong cách và màu sắc hài hòa với trang phục ở ảnh 2 để tạo nên một bộ sưu tập thời trang hoàn chỉnh.
        4. Kết quả phải là một bức ảnh chất lượng cao, chân thực (photorealistic) như ảnh chụp studio chuyên nghiệp.
        5. Tỉ lệ khung hình là ${aspectRatio}.`,
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ parts: [modelPart, garmentPart, promptPart] }],
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
          }
        },
        safetySettings: [
          {
            category: 'HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            category: 'HARASSMENT',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            category: 'SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            category: 'DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH'
          }
        ]
      } as any);

      if (response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error("Yêu cầu bị chặn bởi bộ lọc an toàn của AI. Hãy đảm bảo hình ảnh không chứa nội dung nhạy cảm, thương hiệu lớn bị bảo hộ, hoặc gương mặt người nổi tiếng.");
      }

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error("AI không phản hồi. Vui lòng thử lại sau.");
      }

      let generatedBase64 = "";
      let aiResponseText = "";

      if (response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            generatedBase64 = part.inlineData.data;
          }
          if (part.text) {
            aiResponseText += part.text;
          }
        }
      }

      if (generatedBase64) {
        setResultImage(`data:image/png;base64,${generatedBase64}`);
      } else if (aiResponseText) {
        throw new Error(`AI phản hồi: ${aiResponseText}`);
      } else {
        throw new Error("Không tìm thấy dữ liệu ảnh trong kết quả. Vui lòng thử với cặp ảnh khác.");
      }
    } catch (err: any) {
      console.error("Lỗi AI:", err);
      setError("Không thể tạo ảnh: " + (err.message || "Lỗi đường truyền hoặc máy chủ bận"));
    } finally {
      clearInterval(stepInterval);
      setIsGenerating(false);
      setVeo3Prompt(null);
      setVeo3UserRequest('');
    }
  };

  const generateVEO3Prompt = async (imageUrl: string) => {
    const geminiKey = apiKey.trim() || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      setError("Vui lòng nhập API Key để sử dụng tính năng VEO3.");
      return;
    }

    setIsGeneratingVEO3(true);
    setVeo3Prompt(null);
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      
      const base64Data = imageUrl.split(',')[1];
      const mimeType = imageUrl.split(',')[0].split(':')[1].split(';')[0];

      const promptText = `Bạn là một kỹ sư Prompt AI chuyên nghiệp cho VEO3, Midjourney và Stable Diffusion.
      Hãy phân tích hình ảnh thời trang này và viết một PROMPT CHI TIẾT bậc nhất để tái tạo lại phong cách này trong VEO3 hoặc các model video AI cao cấp.
      
      ${veo3UserRequest ? `YÊU CẦU ĐẶC BIỆT TỪ NGƯỜI DÙNG: "${veo3UserRequest}"` : ''}

      Yêu cầu Prompt phải bao gồm:
      1. Chủ thể: Mô tả người mẫu, gương mặt, vóc dáng.
      2. Trang phục: Mô tả chi tiết chất liệu vải (lụa, denim, da...), kiểu dáng, đường cắt, phụ kiện đính kèm.
      3. Bối cảnh & Ánh sáng: Mô tả studio, ánh sáng điện ảnh (cinematic lighting), màu sắc chủ đạo.
      4. Thông số kỹ thuật: Realistic, 8k, photorealistic, highly detailed, fashion photography.
      
      Hãy viết prompt bằng TIẾNG ANH hoàn toàn (vì các model AI hiểu tốt nhất). Không cần giải thích thêm.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              }
            ]
          }
        ]
      });

      let responseText = "";
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            responseText += part.text;
          }
        }
      }
      
      if (!responseText) {
        throw new Error("AI không trả về văn bản. Thử lại sau.");
      }

      setVeo3Prompt(responseText);
    } catch (err: any) {
      console.error("Lỗi tạo VEO3 Prompt:", err);
      const msg = err.message || "";
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        setVeo3Prompt("Hệ thống đang quá tải. Vui lòng thử lại sau giây lát.");
      } else if (msg.includes('404')) {
        setVeo3Prompt("Lỗi cấu hình Model (404). Vui lòng kiểm tra lại thiết lập hệ thống.");
      } else {
        setVeo3Prompt("Có lỗi xảy ra khi tạo Prompt VEO3. Vui lòng thử lại.");
      }
    } finally {
      setIsGeneratingVEO3(false);
    }
  };

  const handleTabChange = (tab: 'design' | 'veo3') => {
    setActiveTab(tab);
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `ai-fashion-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 z-30">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tighter">STUDIO <span className="text-indigo-600">AI</span></span>
          </div>

          <nav className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => handleTabChange('design')}
              className={cn(
                "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                activeTab === 'design' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Thiết kế
            </button>
            <button 
              onClick={() => handleTabChange('veo3')}
              className={cn(
                "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all relative",
                activeTab === 'veo3' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800",
                !resultImage && "opacity-50 cursor-not-allowed"
              )}
            >
              VEO3 Gen
              {resultImage && !veo3Prompt && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
              )}
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 uppercase text-[9px] font-black tracking-widest text-slate-500">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            Hệ thống ổn định
          </div>
          <div className="hidden sm:block h-4 w-px bg-slate-200"></div>
          <button 
            onClick={handleDownload}
            disabled={!resultImage}
            className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
          >
            Tải Ảnh
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Sidebar: Assets Upload */}
        <aside className="w-full lg:w-72 border-r border-slate-200 bg-white flex flex-col p-6 gap-6 overflow-y-auto lg:shrink-0">
          {/* API Key Input */}
          <div className="space-y-3 mb-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Gemini API Key</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Key className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Nhập khóa để bắt đầu..."
                className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-2xl text-[11px] font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50/50"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <UploadZone 
              label="1. Chọn Người Mẫu"
              description="Tải ảnh chân dung/toàn thân"
              image={modelImage}
              onImageUpload={setModelImage}
            />
            <UploadZone 
              label="2. Chọn Trang Phục"
              description="Tải ảnh quần áo/váy"
              image={garmentImage}
              onImageUpload={setGarmentImage}
            />
          </div>
          
          <div className="mt-auto hidden lg:block">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <p className="text-[10px] text-indigo-700 leading-relaxed font-bold uppercase tracking-wider mb-2">
                💡 Mẹo AI
              </p>
              <p className="text-[11px] text-indigo-600/80 leading-relaxed">
                Hệ thống tự động phối thêm phụ kiện phù hợp và đồng bộ ánh sáng để tạo nên tác phẩm thời trang hoàn hảo nhất.
              </p>
            </div>
          </div>
        </aside>

        {/* Center: Preview Area */}
        <section className="flex-1 bg-slate-100 relative flex items-center justify-center p-4 lg:p-12 overflow-hidden">
          {/* Grid Overlay Background */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          
          <AnimatePresence mode="wait">
            {activeTab === 'design' ? (
              <div 
                key={`${aspectRatio}-${resultImage ? 'ready' : 'empty'}`}
                className={cn(
                  "relative bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] overflow-hidden flex items-center justify-center transition-all duration-700 ease-in-out",
                  aspectRatio === '9:16' ? "h-full aspect-[9/16]" : "w-full max-w-5xl aspect-[16/9]"
                )}
                style={{ maxHeight: '95%', border: '8px solid white', borderRadius: '4px' }}
              >
                {resultImage ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-full relative"
                  >
                    <img 
                      src={resultImage} 
                      alt="Result" 
                      className="w-full h-full object-cover"
                      style={{ transform: `scale(${zoom})` }}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-4 left-4 right-4 flex justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <div className="px-4 py-2 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold rounded-full">
                        CHẾ ĐỘ XEM STUDIO
                      </div>
                    </div>
                  </motion.div>
                ) : isGenerating ? (
                  <div className="flex flex-col items-center gap-6 px-8 text-center">
                    <div className="relative">
                      <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" strokeWidth={1.5} />
                      <Sparkles className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">{loadingMessages[loadingStep]}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vui lòng đợi trong giây lát...</p>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-indigo-600"
                        initial={{ width: "0%" }}
                        animate={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}
                        transition={{ duration: 4 }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-200 p-12 text-center">
                    <div className="w-24 h-24 rounded-full border-2 border-slate-100 flex items-center justify-center mb-6">
                      <Ratio className="w-10 h-10 opacity-20" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-300">Đang chờ xử lý dữ liệu</p>
                    <p className="mt-4 text-[11px] font-medium text-slate-400 max-w-xs">Tải lên ảnh người mẫu và trang phục ở cột bên trái để bắt đầu thiết kế.</p>
                  </div>
                )}

                {/* Decorative Corner Handles */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-slate-100 -translate-x-2 -translate-y-2"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-slate-100 translate-x-2 -translate-y-2"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-slate-100 -translate-x-2 translate-y-2"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-slate-100 translate-x-2 translate-y-2"></div>
              </div>
            ) : (
              <motion.div 
                key="veo3-panel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-4xl h-full flex flex-col gap-6"
              >
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black uppercase tracking-widest text-slate-800">VEO3 Prompt Master</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tối ưu hóa mã Prompt Video AI</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    {/* Section 1: User Request Input */}
                    <div className="shrink-0 space-y-3">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mục 1: Nhập yêu cầu sáng tạo</label>
                      <div className="relative">
                        <textarea
                          value={veo3UserRequest}
                          onChange={(e) => setVeo3UserRequest(e.target.value)}
                          placeholder="Ví dụ: Thêm ánh sáng hoàng hôn, chân thực hơn, tập trung vào chất liệu vải..."
                          className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none resize-none custom-scrollbar"
                        />
                        <button 
                          onClick={() => resultImage && generateVEO3Prompt(resultImage)}
                          disabled={isGeneratingVEO3 || !resultImage}
                          className="absolute bottom-3 right-3 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                          {isGeneratingVEO3 ? "Đang xử lý..." : "Phát sinh Prompt"}
                        </button>
                      </div>
                    </div>

                    {/* Section 2: AI Result Display */}
                    <div className="flex-1 flex flex-col overflow-hidden space-y-3">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mục 2: Phân tích & Xuất Prompt (Tiếng Anh)</label>
                      <div className="flex-1 bg-slate-900 rounded-2xl p-6 overflow-y-auto relative custom-scrollbar border border-slate-800 shadow-inner">
                        {isGeneratingVEO3 ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/80 backdrop-blur-sm z-10">
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" strokeWidth={1} />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 animate-pulse">Engaging Neural Engine...</p>
                          </div>
                        ) : null}
                        
                        {veo3Prompt ? (
                          <div className="text-[13px] leading-relaxed font-mono text-indigo-100 whitespace-pre-wrap">
                            {veo3Prompt}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3 text-center">
                            <Loader2 className="w-6 h-6 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Đang chờ thông số thiết kế...</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 3: Copy Action */}
                    <div className="shrink-0">
                      <button 
                        onClick={() => {
                          if (!veo3Prompt) return;
                          navigator.clipboard.writeText(veo3Prompt);
                          alert("Prompt đã được sao chép vào bộ nhớ tạm!");
                        }}
                        disabled={!veo3Prompt}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-[0_15px_30px_-10px_rgba(79,70,229,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none"
                      >
                        Mục 3: Sao chép Master Prompt
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 shrink-0">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Độ chân thực</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="flex-1 h-1 bg-indigo-600 rounded-full"></div>)}
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Chi tiết vải</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map(i => <div key={i} className="flex-1 h-1 bg-indigo-600 rounded-full"></div>)}
                      <div className="flex-1 h-1 bg-slate-100 rounded-full"></div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Ánh sáng Studio</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="flex-1 h-1 bg-indigo-600 rounded-full"></div>)}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Right Sidebar: Configuration */}
        <aside className="w-full lg:w-80 border-l border-slate-200 bg-white flex flex-col p-6 gap-8 overflow-y-auto lg:shrink-0">
          
          {/* Aspect Ratio Selection */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">Tỉ Lệ Khung Hình</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setAspectRatio('9:16')}
                className={cn(
                  "p-5 border-2 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-95",
                  aspectRatio === '9:16' ? "border-indigo-600 bg-indigo-50 shadow-inner" : "border-slate-50 bg-white hover:bg-slate-50"
                )}
              >
                <div className={cn("w-6 h-10 border-2 rounded-md", aspectRatio === '9:16' ? "border-indigo-600" : "border-slate-300")}></div>
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", aspectRatio === '9:16' ? "text-indigo-700" : "text-slate-400")}>Dọc 9:16</span>
              </button>
              <button 
                onClick={() => setAspectRatio('16:9')}
                className={cn(
                  "p-5 border-2 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-95",
                  aspectRatio === '16:9' ? "border-indigo-600 bg-indigo-50 shadow-inner" : "border-slate-50 bg-white hover:bg-slate-50"
                )}
              >
                <div className={cn("w-10 h-6 border-2 rounded-md", aspectRatio === '16:9' ? "border-indigo-600" : "border-slate-300")}></div>
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", aspectRatio === '16:9' ? "text-indigo-700" : "text-slate-400")}>Ngang 16:9</span>
              </button>
            </div>
          </div>

          {/* Sizing Controls */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">Phóng Đại Hiển Thị</label>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                  <span className="text-slate-500">Mức Zoom</span>
                  <span className="text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-md border border-indigo-100">{Math.round(zoom * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="1.5" 
                  step="0.05" 
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-4">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] uppercase font-bold rounded-xl flex items-start gap-3"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
            
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !modelImage || !garmentImage}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:bg-slate-200 disabled:shadow-none disabled:cursor-not-allowed group"
            >
              <span className="flex items-center justify-center gap-2">
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
                )}
                {isGenerating ? "Hệ thống đang xử lý..." : "Bắt đầu thiết kế"}
              </span>
            </button>
            
            <button 
              onClick={() => {
                setResultImage(null);
                setModelImage(null);
                setGarmentImage(null);
                setZoom(1);
                setError(null);
              }}
              className="w-full py-3 bg-white text-slate-400 border border-slate-100 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
            >
              Thiết kế mới
            </button>
          </div>
        </aside>
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-10 bg-white border-t border-slate-100 px-8 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-6 text-[9px] uppercase font-bold tracking-[0.2em] text-slate-400">
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            Core: AI Accelerated
          </span>
          <span className="h-3 w-px bg-slate-100 hidden sm:block"></span>
          <span className="hidden sm:inline">Model: Gemini 2.5 Flash Image</span>
        </div>
        <div className="text-[9px] font-black tracking-widest text-slate-300 uppercase">
          Studio Edition v3.0
        </div>
      </footer>
    </div>
  );
}
