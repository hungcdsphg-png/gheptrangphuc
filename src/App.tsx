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
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      setError("Vui lòng nhập Gemini API Key của bạn.");
      return;
    }
    
    if (!modelImage || !garmentImage) {
      setError("Vui lòng tải lên cả ảnh người mẫu và ảnh trang phục.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResultImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
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
        }
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error("AI không thể tạo kết quả (có thể do bộ lọc an toàn hoặc lỗi hệ thống).");
      }

      let generatedBase64 = "";
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedBase64 = part.inlineData.data;
          break;
        }
      }

      if (generatedBase64) {
        setResultImage(`data:image/png;base64,${generatedBase64}`);
      } else {
        throw new Error("Không tìm thấy dữ liệu ảnh trong phản hồi của AI.");
      }
    } catch (err: any) {
      setError("Có lỗi xảy ra khi tạo ảnh: " + (err.message || "Lỗi không xác định"));
    } finally {
      setIsGenerating(false);
    }
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
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Ghép ảnh Studio</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span className="hidden sm:inline">Dự án: Mùa Hè 2024</span>
          <div className="hidden sm:block h-4 w-px bg-slate-200"></div>
          <button 
            onClick={handleDownload}
            disabled={!resultImage}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all"
          >
            Xuất Ảnh
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Sidebar: Assets Upload */}
        <aside className="w-full lg:w-72 border-r border-slate-200 bg-white flex flex-col p-6 gap-6 overflow-y-auto lg:shrink-0">
          <UploadZone 
            label="1. Chọn Người Mẫu"
            description="Tải ảnh mẫu"
            image={modelImage}
            onImageUpload={setModelImage}
          />
          <UploadZone 
            label="2. Chọn Trang Phục"
            description="Tải trang phục"
            image={garmentImage}
            onImageUpload={setGarmentImage}
          />
          
          <div className="mt-auto hidden lg:block">
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                <span className="font-bold">Mẹo AI:</span> Hệ thống tự động phối thêm phụ kiện (giày, túi, mũ) phù hợp và điều chỉnh ánh sáng đồng bộ để tạo nên vẻ ngoài chuyên nghiệp nhất.
              </p>
            </div>
          </div>
        </aside>

        {/* Center: Preview Area */}
        <section className="flex-1 bg-slate-100 relative flex items-center justify-center p-4 lg:p-8 overflow-hidden">
          {/* Grid Overlay Background */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
          
          <AnimatePresence mode="wait">
            <div 
              key={`${aspectRatio}-${resultImage ? 'ready' : 'empty'}`}
              className={cn(
                "relative bg-white shadow-2xl overflow-hidden flex items-center justify-center transition-all duration-500",
                aspectRatio === '9:16' ? "h-full aspect-[9/16]" : "w-full max-w-4xl aspect-[16/9]"
              )}
              style={{ maxHeight: '90%', border: '4px solid white' }}
            >
              {resultImage ? (
                <motion.img 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={resultImage} 
                  alt="Result" 
                  className="w-full h-full object-cover transition-transform duration-300"
                  style={{ transform: `scale(${zoom})` }}
                  referrerPolicy="no-referrer"
                />
              ) : isGenerating ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                  <p className="text-sm font-bold text-indigo-600 animate-pulse tracking-wider">AI ĐANG THIẾT KẾ...</p>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 p-8 text-center">
                  <Ratio className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Đang chờ dữ liệu đầu vào...</p>
                </div>
              )}

              {/* Scale Handle UI Decorator */}
              <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border border-slate-200 cursor-nwse-resize z-10">
                <Maximize2 className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </AnimatePresence>

          {/* Floating Action Status */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-slate-900 text-white rounded-full text-xs font-bold shadow-xl flex items-center gap-3 backdrop-blur-md z-20">
            <div className={cn(
              "w-2 h-2 rounded-full",
              modelImage && garmentImage ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
            )}></div>
            {modelImage && garmentImage ? "HỆ THỐNG: SẴN SÀNG" : "HỆ THỐNG: CHỜ DỮ LIỆU"}
          </div>
        </section>

        {/* Right Sidebar: Configuration */}
        <aside className="w-full lg:w-80 border-l border-slate-200 bg-white flex flex-col p-6 gap-8 overflow-y-auto lg:shrink-0">
          {/* API Key Section */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Cấu Hình API</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Nhập Gemini API Key..."
                className="block w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-[9px] text-slate-400 leading-tight">
              Sử dụng khóa API từ Google AI Studio để thực hiện các yêu cầu tạo ảnh.
            </p>
          </div>

          {/* Aspect Ratio Selection */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Tỉ Lệ Khung Hình</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setAspectRatio('9:16')}
                className={cn(
                  "p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all",
                  aspectRatio === '9:16' ? "border-indigo-500 bg-indigo-50" : "border-slate-100 bg-white hover:bg-slate-50"
                )}
              >
                <div className={cn("w-5 h-8 border-2 rounded-sm", aspectRatio === '9:16' ? "border-indigo-600" : "border-slate-400")}></div>
                <span className={cn("text-[10px] font-bold uppercase tracking-tighter", aspectRatio === '9:16' ? "text-indigo-700" : "text-slate-500")}>Dọc 9:16</span>
              </button>
              <button 
                onClick={() => setAspectRatio('16:9')}
                className={cn(
                  "p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all",
                  aspectRatio === '16:9' ? "border-indigo-500 bg-indigo-50" : "border-slate-100 bg-white hover:bg-slate-50"
                )}
              >
                <div className={cn("w-8 h-5 border-2 rounded-sm", aspectRatio === '16:9' ? "border-indigo-600" : "border-slate-400")}></div>
                <span className={cn("text-[10px] font-bold uppercase tracking-tighter", aspectRatio === '16:9' ? "text-indigo-700" : "text-slate-500")}>Ngang 16:9</span>
              </button>
            </div>
          </div>

          {/* Sizing Controls */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Tùy Chỉnh Hiển Thị</label>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-600">Độ Phóng Đại</span>
                  <span className="text-indigo-600">{Math.round(zoom * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2" 
                  step="0.1" 
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] uppercase font-bold rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {error}
              </div>
            )}
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !modelImage || !garmentImage || !apiKey.trim()}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? "ĐANG XỬ LÝ..." : "TẠO NGƯỜI MẪU"}
            </button>
            <button 
              onClick={() => {
                setResultImage(null);
                setModelImage(null);
                setGarmentImage(null);
                setZoom(1);
              }}
              className="w-full py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors"
            >
              Làm Mới Toàn Bộ
            </button>
          </div>
        </aside>
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-4 text-[9px] uppercase font-bold tracking-[0.2em] text-slate-400">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
            GPU: AI ACCELERATED - ONLINE
          </span>
          <span className="h-3 w-px bg-slate-200 hidden sm:block"></span>
          <span className="hidden sm:inline">Engine: Gemini 2.5 Flash</span>
        </div>
        <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
          v2.4.0-stabilize
        </div>
      </footer>
    </div>
  );
}
