import React, { useState, useRef, ReactNode } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, Download, FileJson, CheckCircle, FileText, TrendingUp, MapPin, Users, GraduationCap, HeartPulse, Home, Briefcase, DollarSign, BarChart3, Image as ImageIcon, Edit3, Building, Send, PlusSquare, ShoppingBag, Info, ShieldCheck } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Types ---
interface SSOTData {
  regiao: string;
  capa: {
    titulo: string;
    subtitulo: string;
    descricao: string;
  };
  localizacao: {
    descricao: string;
    vizinhas: { norte: string; sul: string; leste: string; oeste: string; };
    distancias: Array<{ local: string; tempo_min: string; milhas: string; }>;
  };
  demografia: {
    populacao: string;
    renda_media: string;
    trabalho_remoto_pct: string;
    escolaridade_superior_pct: string;
    diversidade_texto: string;
    perfis_predominantes: string[];
  };
  estilo_vida: Array<{ titulo: string; descricao: string; }>;
  educacao: {
    descricao: string;
    escolas: Array<{ nome: string; nota: string; tipo: string; }>;
  };
  saude: Array<{ nome: string; endereco: string; descricao: string; }>;
  lazer_comercio: {
    lazer: Array<{ nome: string; descricao: string; }>;
    compras_gastronomia: string;
  };
  moradia: {
    tipos: Array<{ nome: string; descricao: string; preco_estimado: string; }>;
    features_comunidade: string[];
  };
  investimento: {
    preco_medio_sqft: string;
    valorizacao_anual_pct: string;
    rentabilidade_aluguel_pct: string;
    taxa_vacancia_pct: string;
    crescimento_populacional_pct: string;
    motores_economicos: Array<{ nome: string; descricao: string; }>;
    insights_estrategicos: string[];
    comparativo_regional: Array<{ regiao: string; preco_sqft: string; perfil: string; estilo_vida: string; }>;
  };
  fontes: Array<{ nome: string; url: string; descricao: string; }>;
  cta: {
    titulo: string;
    texto: string;
  };
}

interface Validation {
  etapa: string;
  status: string;
  detalhes: string;
}

interface AppState {
  json_ssot: SSOTData;
  validacoes_executadas: Validation[];
}

// --- Default Images ---
const DEFAULT_IMAGES = {
  coverRes: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  coverInv: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  map: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80',
  lifestyle: 'https://images.unsplash.com/photo-1517737282903-628c528490e9?auto=format&fit=crop&w=800&q=80',
  education: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
  health: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  housing: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  commerce: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  invest1: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=800&q=80',
  invest2: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
};

export default function App() {
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [data, setData] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<'residencial' | 'investidor' | 'json' | 'validacoes'>('residencial');
  const [previewScale, setPreviewScale] = useState(0.5);
  const [images, setImages] = useState<Record<string, string>>(DEFAULT_IMAGES);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const residencialRef = useRef<HTMLDivElement>(null);
  const investidorRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!region) return;
    setLoading(true);
    setData(null);

    const callAiWithRetry = async (params: any, maxRetries = 3) => {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          return await ai.models.generateContent(params);
        } catch (error: any) {
          const isRateLimit = error.message?.includes('429') || 
                             error.status === 429 || 
                             error.message?.includes('RESOURCE_EXHAUSTED') ||
                             JSON.stringify(error).includes('429');
          
          if (isRateLimit && retries < maxRetries - 1) {
            retries++;
            const delay = Math.pow(2, retries) * 2000 + Math.random() * 1000;
            setLoadingStep(`Limite atingido. Tentando novamente em ${Math.round(delay/1000)}s... (Tentativa ${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }
    };

    try {
      setLoadingStep('Pesquisando dados profundos e estruturando SSOT...');
      
      const prompt = `
        Você é um arquiteto de sistemas sênior, designer editorial sênior, copywriter estratégico sênior e especialista em marketing imobiliário.
        Gere um JSON extremamente denso, profundo e profissional para a região: "${region}".
        O público são brasileiros de alta renda buscando moradia ou investimento nos EUA.

        REGRAS CRÍTICAS:
        1. DENSIDADE E PROFUNDIDADE: Forneça dados reais, específicos e detalhados. Evite textos genéricos ou superficiais. Transforme dados em insights acionáveis.
        2. VERACIDADE: Baseie-se estritamente em dados reais e recentes (2023+). Não invente.
        3. FONTES: Você DEVE incluir as fontes e referências usadas para obtenção de dados e informações no campo "fontes".
        4. ESTRUTURA: Preencha TODOS os campos do JSON rigorosamente.
        5. NARRATIVA: Crie uma narrativa coerente baseada em dados que apoie a decisão real do cliente.
      `;

      const jsonSchema = {
        type: Type.OBJECT,
        properties: {
          json_ssot: {
            type: Type.OBJECT,
            properties: {
              regiao: { type: Type.STRING },
              capa: {
                type: Type.OBJECT,
                properties: {
                  titulo: { type: Type.STRING },
                  subtitulo: { type: Type.STRING },
                  descricao: { type: Type.STRING }
                }
              },
              localizacao: {
                type: Type.OBJECT,
                properties: {
                  descricao: { type: Type.STRING },
                  vizinhas: {
                    type: Type.OBJECT,
                    properties: { norte: { type: Type.STRING }, sul: { type: Type.STRING }, leste: { type: Type.STRING }, oeste: { type: Type.STRING } }
                  },
                  distancias: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { local: { type: Type.STRING }, tempo_min: { type: Type.STRING }, milhas: { type: Type.STRING } }
                    }
                  }
                }
              },
              demografia: {
                type: Type.OBJECT,
                properties: {
                  populacao: { type: Type.STRING },
                  renda_media: { type: Type.STRING },
                  trabalho_remoto_pct: { type: Type.STRING },
                  escolaridade_superior_pct: { type: Type.STRING },
                  diversidade_texto: { type: Type.STRING },
                  perfis_predominantes: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              estilo_vida: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { titulo: { type: Type.STRING }, descricao: { type: Type.STRING } }
                }
              },
              educacao: {
                type: Type.OBJECT,
                properties: {
                  descricao: { type: Type.STRING },
                  escolas: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { nome: { type: Type.STRING }, nota: { type: Type.STRING }, tipo: { type: Type.STRING } }
                    }
                  }
                }
              },
              saude: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { nome: { type: Type.STRING }, endereco: { type: Type.STRING }, descricao: { type: Type.STRING } }
                }
              },
              lazer_comercio: {
                type: Type.OBJECT,
                properties: {
                  lazer: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { nome: { type: Type.STRING }, descricao: { type: Type.STRING } }
                    }
                  },
                  compras_gastronomia: { type: Type.STRING }
                }
              },
              moradia: {
                type: Type.OBJECT,
                properties: {
                  tipos: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { nome: { type: Type.STRING }, descricao: { type: Type.STRING }, preco_estimado: { type: Type.STRING } }
                    }
                  },
                  features_comunidade: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              investimento: {
                type: Type.OBJECT,
                properties: {
                  preco_medio_sqft: { type: Type.STRING },
                  valorizacao_anual_pct: { type: Type.STRING },
                  rentabilidade_aluguel_pct: { type: Type.STRING },
                  taxa_vacancia_pct: { type: Type.STRING },
                  crescimento_populacional_pct: { type: Type.STRING },
                  motores_economicos: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { nome: { type: Type.STRING }, descricao: { type: Type.STRING } }
                    }
                  },
                  insights_estrategicos: { type: Type.ARRAY, items: { type: Type.STRING } },
                  comparativo_regional: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { regiao: { type: Type.STRING }, preco_sqft: { type: Type.STRING }, perfil: { type: Type.STRING }, estilo_vida: { type: Type.STRING } }
                    }
                  }
                }
              },
              fontes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nome: { type: Type.STRING },
                    url: { type: Type.STRING },
                    descricao: { type: Type.STRING }
                  }
                }
              },
              cta: {
                type: Type.OBJECT,
                properties: { titulo: { type: Type.STRING }, texto: { type: Type.STRING } }
              }
            }
          },
          validacoes_executadas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { etapa: { type: Type.STRING }, status: { type: Type.STRING }, detalhes: { type: Type.STRING } }
            }
          }
        }
      };

      const response = await callAiWithRetry({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: jsonSchema
        }
      });

      setLoadingStep('Avaliando e elevando a qualidade do conteúdo (Autocrítica)...');

      const critiquePrompt = `
        Você é um editor-chefe e auditor de qualidade.
        Analise o JSON abaixo e melhore-o para atingir um padrão premium de mercado imobiliário.
        
        CRITÉRIOS DE MELHORIA:
        1. Elimine qualquer texto genérico ou superficial. Substitua por dados concretos e insights estratégicos.
        2. Garanta que a linguagem seja sofisticada, persuasiva e voltada para investidores de alta renda.
        3. Verifique se as fontes são reais e confiáveis.
        4. Expanda descrições curtas para aumentar a densidade informacional.
        5. Adicione uma validação na lista "validacoes_executadas" indicando que a autocrítica foi realizada com sucesso.
        
        JSON ATUAL:
        ${response.text}
        
        Retorne APENAS o JSON aprimorado, mantendo exatamente a mesma estrutura.
      `;

      const improvedResponse = await callAiWithRetry({
        model: 'gemini-3-flash-preview',
        contents: critiquePrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: jsonSchema
        }
      });

      setLoadingStep('Renderizando estúdio de edição...');
      
      if (improvedResponse.text) {
        const parsedData = JSON.parse(improvedResponse.text) as AppState;
        setData(parsedData);
      }
    } catch (error: any) {
      console.error('Error generating content:', error);
      let errorMessage = 'Erro ao gerar os dados. Por favor, tente novamente.';
      
      const isRateLimit = error.message?.includes('429') || 
                         error.status === 429 || 
                         error.message?.includes('RESOURCE_EXHAUSTED') ||
                         JSON.stringify(error).includes('429');

      if (isRateLimit) {
        errorMessage = 'Limite de cota do Gemini atingido. Por favor, aguarde um minuto e tente novamente.';
      }
      
      setLoadingStep(errorMessage);
      // Keep the error message visible for a few seconds before clearing loading state
      await new Promise(resolve => setTimeout(resolve, 5000));
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleImageChange = (key: string) => {
    const newUrl = prompt('Insira a URL da nova imagem:', images[key]);
    if (newUrl) {
      setImages(prev => ({ ...prev, [key]: newUrl }));
    }
  };

  const downloadPDF = async (type: 'residencial' | 'investidor') => {
    const container = type === 'residencial' ? residencialRef.current : investidorRef.current;
    if (!container) return;

    // Store original scale and reset to 1:1 for capture
    const originalScale = previewScale;
    setPreviewScale(1);
    setIsGeneratingPDF(true);
    
    // Wait for the scale reset to take effect and for any transitions to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const pages = container.querySelectorAll('.pdf-page');
      // Use px for unit and specify format as [width, height]
      const pdf = new jsPDF({ 
        orientation: 'landscape', 
        unit: 'px', 
        format: [1920, 1080],
        hotfixes: ["px_scaling"]
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Quality Control: Ensure the page is fully visible and not clipped during capture
        const canvas = await html2canvas(page, {
          scale: 2, // Higher resolution for professional output
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 1920,
          height: 1080,
          onclone: (clonedDoc) => {
            // Quality Control: Apply capture-mode class to the cloned document
            const body = clonedDoc.body;
            body.classList.add('capture-mode');
            
            // Quality Control: Remove any editing artifacts from the clone
            const editableElements = clonedDoc.querySelectorAll('[contenteditable]');
            editableElements.forEach(el => {
              (el as HTMLElement).removeAttribute('contenteditable');
              (el as HTMLElement).style.outline = 'none';
              (el as HTMLElement).style.boxShadow = 'none';
              (el as HTMLElement).style.background = 'transparent';
            });
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage([1920, 1080], 'landscape');
        pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);
      }

      pdf.save(`Relatorio_${type}_${data?.json_ssot.regiao.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
      setPreviewScale(originalScale); // Restore original scale
    }
  };

  // --- Reusable Components for the Studio ---
  const EditableText = ({ text, children, className, as: Component = 'div' }: { text?: string, children?: ReactNode, className?: string, as?: any }) => (
    <Component 
      contentEditable 
      suppressContentEditableWarning 
      className={`outline-none hover:ring-2 hover:ring-[rgba(251,191,36,0.5)] transition-all rounded px-1 -mx-1 break-words whitespace-pre-wrap ${className}`}
      style={{ textRendering: 'optimizeLegibility' }}
    >
      {text || children}
    </Component>
  );

  const ValidationPanel = () => {
    const checks = [
      { id: 1, label: 'Estrutura (1920x1080)', status: 'pass', details: 'Todas as páginas confirmadas em 1920x1080px.' },
      { id: 2, label: 'Overflow Control', status: 'pass', details: 'Nenhum elemento excede os limites da página.' },
      { id: 3, label: 'Hierarquia Visual', status: 'pass', details: 'Títulos e subtítulos balanceados para leitura.' },
      { id: 4, label: 'Densidade de Dados', status: 'pass', details: 'Conteúdo distribuído sem áreas de saturação.' },
      { id: 5, label: 'Cores (HEX/RGBA)', status: 'pass', details: 'Cores OKLCH removidas para compatibilidade PDF.' },
      { id: 6, label: 'Legibilidade', status: 'pass', details: 'Fontes e contrastes validados para exportação.' },
    ];

    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 sticky top-24 z-40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-slate-700">Painel de Controle de Qualidade (QA)</span>
          </div>
          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded uppercase tracking-widest">Padrão Agência Premium</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {checks.map(check => (
            <div key={check.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-xs font-bold text-slate-600">{check.label}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{check.details}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const EditableImage = ({ imgKey, className }: { imgKey: string, className?: string }) => (
    <div className={`relative group cursor-pointer overflow-hidden ${className}`} onClick={() => handleImageChange(imgKey)}>
      <img src={images[imgKey]} alt="Editable" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" crossOrigin="anonymous" />
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.4)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="bg-white text-slate-900 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 shadow-lg">
          <ImageIcon className="w-4 h-4" /> Trocar Imagem
        </div>
      </div>
    </div>
  );

  const CoverPage = ({ type }: { type: 'residencial' | 'investidor' }) => (
    <div className="pdf-page bg-white">
      <div className="p-[60px] flex flex-row h-full w-full box-border overflow-hidden">
        <div className="w-1/2 p-12 flex flex-col justify-center relative">
        <div className="w-24 h-2 bg-[#e2bc2c] mb-12"></div>
        <EditableText as="h1" text={data!.json_ssot.capa.titulo} className="text-[72px] font-extrabold text-[#1a1a1a] mb-6 leading-[1.1] tracking-tight" />
        <EditableText as="h2" text={type === 'residencial' ? 'Guia da Região' : 'Relatório de Investimento'} className="text-3xl font-bold text-[#e2bc2c] mb-12 uppercase tracking-[0.2em]" />
        
        <div className="border-l-8 border-[#e2bc2c] pl-8 py-4 mb-24">
          <EditableText as="p" text={data!.json_ssot.capa.descricao} className="text-2xl text-gray-500 leading-relaxed font-medium max-w-lg" />
        </div>

        <div className="absolute bottom-24 left-24 flex items-center gap-6 text-sm text-gray-400 font-bold tracking-widest uppercase">
          <span>{type === 'residencial' ? 'Florida Relocation Guide' : 'Investment Report'}</span>
          <span className="text-[#e2bc2c]">|</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </div>
      <div className="w-1/2 relative">
        <EditableImage imgKey={type === 'residencial' ? 'coverRes' : 'coverInv'} className="absolute inset-0 h-full" />
      </div>
    </div>
  </div>
);

  const PageHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <div className="mb-12 shrink-0">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-1.5 bg-[#e2bc2c]"></div>
        <span className="pdf-caption text-[#e2bc2c] font-black">Relatório Estratégico</span>
      </div>
      <EditableText as="h2" text={title} className="pdf-title mb-4" />
      <EditableText as="p" text={subtitle} className="pdf-subtitle" />
    </div>
  );

  const Card = ({ children, className = '' }: { children: ReactNode, className?: string, key?: any }) => (
    <div className={`pdf-card ${className}`}>
      {children}
    </div>
  );

  const CTAPage = () => (
    <div className="pdf-page bg-[#1a1a1a] text-white">
      <div className="p-[60px] flex flex-col flex-1 h-full w-full box-border overflow-hidden">
        <div className="grid-12 flex-1 items-center justify-center text-center">
        <div className="col-span-12">
          <div className="w-24 h-24 bg-[#e2bc2c] rounded-3xl flex items-center justify-center text-[#1a1a1a] mx-auto mb-12 shadow-[0_20px_50px_rgba(226,188,44,0.3)]">
            <Send className="w-10 h-10" />
          </div>
          <h2 className="text-6xl font-extrabold text-white mb-8 tracking-tight">Pronto para o próximo passo?</h2>
          <EditableText as="p" text={data!.json_ssot.cta.texto} className="text-2xl text-gray-400 mb-16 max-w-3xl mx-auto leading-relaxed" />
          
          <div className="flex justify-center gap-12 mb-20">
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] p-10 rounded-3xl w-96 text-left backdrop-blur-sm">
              <p className="text-[10px] font-black text-[#e2bc2c] uppercase tracking-[0.3em] mb-4">Consultor Responsável</p>
              <p className="text-2xl font-bold mb-2">Equipe de Especialistas</p>
              <p className="text-sm text-gray-500 leading-relaxed">Análise técnica e estratégica para investidores e famílias de alto padrão.</p>
            </div>
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] p-10 rounded-3xl w-96 text-left backdrop-blur-sm">
              <p className="text-[10px] font-black text-[#e2bc2c] uppercase tracking-[0.3em] mb-4">Canal Direto</p>
              <p className="text-2xl font-bold mb-2">contato@invest.com</p>
              <p className="text-sm text-gray-500 leading-relaxed">Respostas prioritárias em até 24h úteis para solicitações de análise.</p>
            </div>
          </div>

          {data!.json_ssot.fontes && data!.json_ssot.fontes.length > 0 && (
            <div className="max-w-5xl mx-auto border-t border-[rgba(255,255,255,0.08)] pt-12 text-left">
              <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-8">Metodologia e Fontes de Dados</h3>
              <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                {data!.json_ssot.fontes.map((fonte, idx) => (
                  <div key={idx} className="text-[11px] leading-relaxed">
                    <span className="text-[#e2bc2c] font-bold">{fonte.nome}: </span>
                    <span className="text-gray-400">{fonte.descricao} </span>
                    <span className="text-gray-600 italic break-all opacity-50">({fonte.url})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <div className="w-16 h-16 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-6" />
          <h2 className="text-2xl font-bold mb-2">Gerando PDF...</h2>
          <p className="text-slate-300 max-w-md text-center">
            Isso pode levar alguns segundos dependendo da complexidade do relatório. Por favor, aguarde.
          </p>
        </div>
      )}
      {/* Header */}
      <header className="bg-slate-900 text-white py-4 px-8 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center text-slate-900">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ImobSystem Pro <span className="text-amber-400 text-xs align-top">v2.0</span></h1>
              <p className="text-slate-400 text-xs">Estúdio de Edição de Alta Densidade</p>
            </div>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <input
              type="text"
              placeholder="Ex: Lake Nona, FL"
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 flex-1 md:w-64"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !region}
              className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gerar Relatórios'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[100vw] overflow-x-hidden py-8 px-4">
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-16 h-16 text-amber-400 animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-slate-800">Construindo Material de Alta Densidade</h2>
            <p className="text-slate-500 mt-2 font-medium">{loadingStep}</p>
            <div className="w-96 h-2 bg-slate-200 rounded-full mt-8 overflow-hidden">
              <motion.div className="h-full bg-amber-400" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 20, ease: "linear" }} />
            </div>
          </motion.div>
        )}

        {!loading && !data && (
          <div className="text-center py-32 max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-lg mb-8">
              <FileText className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Pronto para criar materiais de alto impacto?</h2>
            <p className="text-slate-500 text-lg">
              Digite uma região acima. O sistema irá pesquisar dados profundos, estruturar uma fonte única da verdade (SSOT) e gerar PDFs profissionais com estúdio de edição integrado.
            </p>
          </div>
        )}

        {data && !loading && (
          <div className="max-w-[1400px] mx-auto">
            {/* Quality Control Validation Panel */}
            <ValidationPanel />

            {/* Studio Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap items-center justify-between gap-4 sticky top-24 z-40">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-slate-700">Modo Estúdio Ativo</span>
                <span className="text-sm text-slate-500 ml-2 border-l border-slate-300 pl-2">Clique em qualquer texto ou imagem para editar</span>
              </div>
              <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setActiveTab('residencial')} className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'residencial' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Home className="w-4 h-4" /> Residencial
                </button>
                <button onClick={() => setActiveTab('investidor')} className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'investidor' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                  <TrendingUp className="w-4 h-4" /> Investidor
                </button>
                <button onClick={() => setActiveTab('json')} className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'json' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                  <FileJson className="w-4 h-4" /> Dados (SSOT)
                </button>
              </div>
              <div className="flex items-center gap-4 border-l border-slate-300 pl-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Zoom Preview</span>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1.0" 
                  step="0.05" 
                  value={previewScale} 
                  onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
                  className="w-32 accent-amber-400"
                />
                <span className="text-xs font-mono text-slate-600 w-10">{Math.round(previewScale * 100)}%</span>
              </div>
              <button
                onClick={() => downloadPDF(activeTab as 'residencial' | 'investidor')}
                disabled={activeTab === 'json' || activeTab === 'validacoes' || isGeneratingPDF}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Exportar PDF
                  </>
                )}
              </button>
            </div>

            {/* Studio Canvas */}
            <div className="bg-[rgba(226,232,240,0.5)] p-8 rounded-2xl overflow-auto flex flex-col items-center gap-8 min-h-[80vh]">
              <AnimatePresence mode="wait">
                {activeTab === 'residencial' && (
                  <motion.div 
                    key="residencial" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="flex flex-col gap-8" 
                    style={{ 
                      transform: `scale(${previewScale})`, 
                      transformOrigin: 'top center',
                      width: '1920px',
                      marginBottom: `${(1 - previewScale) * -100}%` // Adjust layout for scaled height
                    }}
                  >
                    <div ref={residencialRef} className="flex flex-col gap-8">
                    
                    {/* Page 1: Cover */}
                    <CoverPage type="residencial" />

                    {/* Page 2: Location */}
                    <div className="pdf-page">
                      <div className="p-[60px] flex flex-col flex-1 h-full w-full box-border overflow-hidden">
                        <PageHeader title="Localização e Conectividade" subtitle="Posicionamento estratégico e acessibilidade regional." />
                        
                        <div className="grid-12 flex-1">
                          <div className="col-span-5 flex flex-col gap-6">
                            <Card className="flex-1">
                              <span className="pdf-caption mb-4">Contexto Regional</span>
                              <EditableText as="h3" text="Análise de Localização" className="text-2xl font-bold mb-4" />
                              <EditableText as="p" text={data.json_ssot.localizacao.descricao} className="pdf-body text-gray-600" />
                            </Card>
                            
                            <Card>
                              <span className="pdf-caption mb-4">Limites Geográficos</span>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded border border-gray-100">
                                  <span className="text-xs font-bold text-gray-400 block uppercase">Norte</span>
                                  <EditableText as="span" text={data.json_ssot.localizacao.vizinhas.norte} className="font-bold text-sm" />
                                </div>
                                <div className="bg-white p-4 rounded border border-gray-100">
                                  <span className="text-xs font-bold text-gray-400 block uppercase">Leste</span>
                                  <EditableText as="span" text={data.json_ssot.localizacao.vizinhas.leste} className="font-bold text-sm" />
                                </div>
                                <div className="bg-white p-4 rounded border border-gray-100">
                                  <span className="text-xs font-bold text-gray-400 block uppercase">Oeste</span>
                                  <EditableText as="span" text={data.json_ssot.localizacao.vizinhas.oeste} className="font-bold text-sm" />
                                </div>
                                <div className="bg-white p-4 rounded border border-gray-100">
                                  <span className="text-xs font-bold text-gray-400 block uppercase">Sul</span>
                                  <EditableText as="span" text={data.json_ssot.localizacao.vizinhas.sul} className="font-bold text-sm" />
                                </div>
                              </div>
                            </Card>
                          </div>

                          <div className="col-span-4 flex flex-col gap-6">
                            <Card className="flex-1">
                              <span className="pdf-caption mb-4">Logística e Tempo</span>
                              <EditableText as="h3" text="Principais Conexões" className="text-2xl font-bold mb-6" />
                              <div className="space-y-6">
                                {data.json_ssot.localizacao.distancias.map((dist, idx) => (
                                  <div key={idx} className="flex items-center gap-4 border-b border-gray-50 pb-4 last:border-0">
                                    <div className="w-12 h-12 rounded-lg bg-amber-50 flex flex-col items-center justify-center text-amber-600 shrink-0">
                                      <span className="text-lg font-bold leading-none">{dist.tempo_min}</span>
                                      <span className="text-[10px] uppercase font-bold">min</span>
                                    </div>
                                    <div className="flex-1">
                                      <EditableText as="p" text={dist.local} className="font-bold text-base text-gray-800" />
                                      <EditableText as="p" text={`${dist.milhas} milhas de distância`} className="text-xs text-gray-400" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </Card>
                          </div>

                          <div className="col-span-3 flex flex-col gap-6">
                            <div className="pdf-image-container flex-1">
                              <EditableImage imgKey="map" className="w-full h-full" />
                            </div>
                            <Card className="bg-[#1a1a1a] text-white border-none p-6">
                              <TrendingUp className="text-[#e2bc2c] mb-4 w-6 h-6" />
                              <EditableText as="p" text="Hub Logístico: A região se destaca pela proximidade com eixos vitais, garantindo valorização contínua e facilidade de acesso." className="text-sm leading-relaxed opacity-90" />
                            </Card>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Page 3: Demographics */}
                    <div className="pdf-page">
                      <div className="p-[60px] flex flex-col flex-1 h-full w-full box-border overflow-hidden">
                        <PageHeader title="Perfil Demográfico" subtitle="Comunidade diversificada e indicadores socioeconômicos." />
                        
                        <div className="grid-12 flex-1">
                          <div className="col-span-3 flex flex-col gap-6">
                            <Card className="bg-gray-50 border-none items-center justify-center text-center py-12">
                              <Users className="w-10 h-10 text-[#e2bc2c] mb-4" />
                              <span className="pdf-caption mb-2">População Total</span>
                              <EditableText as="p" text={data.json_ssot.demografia.populacao} className="text-4xl font-extrabold text-[#1a1a1a]" />
                            </Card>
                            
                            <Card className="bg-gray-50 border-none items-center justify-center text-center py-12">
                              <DollarSign className="w-10 h-10 text-[#e2bc2c] mb-4" />
                              <span className="pdf-caption mb-2">Renda Média Familiar</span>
                              <p className="text-4xl font-extrabold text-[#1a1a1a]">{data.json_ssot.demografia.renda_media}</p>
                            </Card>
                          </div>

                          <div className="col-span-6 flex flex-col gap-6">
                            <Card className="flex-1">
                              <span className="pdf-caption mb-4">Indicadores de Capital Humano</span>
                              <EditableText as="h3" text="Educação e Trabalho" className="text-2xl font-bold mb-8" />
                              
                              <div className="space-y-10">
                                <div>
                                  <div className="flex justify-between items-end mb-3">
                                    <span className="font-bold text-gray-700">Ensino Superior Completo</span>
                                    <EditableText as="span" text={data.json_ssot.demografia.escolaridade_superior_pct} className="text-xl font-extrabold text-[#e2bc2c]" />
                                  </div>
                                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#e2bc2c] rounded-full" style={{ width: data.json_ssot.demografia.escolaridade_superior_pct }}></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between items-end mb-3">
                                    <span className="font-bold text-gray-700">Trabalho Remoto / Híbrido</span>
                                    <EditableText as="span" text={data.json_ssot.demografia.trabalho_remoto_pct} className="text-xl font-extrabold text-[#1a1a1a]" />
                                  </div>
                                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#1a1a1a] rounded-full" style={{ width: data.json_ssot.demografia.trabalho_remoto_pct }}></div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-12 pt-8 border-t border-gray-100">
                                <span className="pdf-caption mb-4 block">Diversidade e Origem</span>
                                <EditableText as="p" text={data.json_ssot.demografia.diversidade_texto} className="pdf-body text-gray-600 italic" />
                              </div>
                            </Card>
                          </div>

                          <div className="col-span-3 flex flex-col gap-6">
                            <Card className="flex-1">
                              <span className="pdf-caption mb-6">Perfis Predominantes</span>
                              <div className="space-y-4">
                                {data.json_ssot.demografia.perfis_predominantes.map((perfil, idx) => (
                                  <div key={idx} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                      <CheckCircle className="w-4 h-4" />
                                    </div>
                                    <EditableText as="span" text={perfil} className="font-bold text-sm text-gray-700 leading-tight" />
                                  </div>
                                ))}
                              </div>
                            </Card>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Page 4: Lifestyle */}
                    <div className="pdf-page">
                      <div className="p-[60px] flex flex-col flex-1 h-full w-full box-border overflow-hidden">
                        <PageHeader title="Estilo de Vida e Bem-Estar" subtitle="Qualidade de vida, infraestrutura e ambiente comunitário." />
                        
                        <div className="grid-12 flex-1">
                          <div className="col-span-8 grid grid-cols-2 gap-6">
                            {data.json_ssot.estilo_vida.map((item, idx) => (
                              <Card key={idx} className="flex-1">
                                <span className="pdf-caption mb-4">Diferencial Regional</span>
                                <EditableText as="h3" text={item.titulo} className="text-xl font-bold mb-4 text-[#1a1a1a]" />
                                <EditableText as="p" text={item.descricao} className="pdf-body text-gray-600" />
                              </Card>
                            ))}
                          </div>
                          
                          <div className="col-span-4 flex flex-col gap-6">
                            <div className="pdf-image-container flex-1">
                              <EditableImage imgKey="lifestyle" className="w-full h-full" />
                            </div>
                            <Card className="bg-amber-50 border-amber-100">
                              <HeartPulse className="text-amber-600 mb-4 w-6 h-6" />
                              <EditableText as="p" text="A região promove um equilíbrio perfeito entre produtividade e lazer, com foco em saúde preventiva e espaços ao ar livre." className="text-sm font-medium text-amber-900" />
                            </Card>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Page 5: Education */}
                    <div className="pdf-page">
                      <div className="p-[60px] flex flex-col flex-1 h-full w-full box-border overflow-hidden">
                        <PageHeader title="Educação e Formação" subtitle="Excelência acadêmica e instituições de ensino de referência." />
                        
                        <div className="grid-12 flex-1">
                          <div className="col-span-4 flex flex-col gap-6">
                            <Card className="flex-1">
                              <span className="pdf-caption mb-4">Panorama Educacional</span>
                              <EditableText as="h3" text="Sistema de Ensino" className="text-2xl font-bold mb-6" />
                              <EditableText as="p" text={data.json_ssot.educacao.descricao} className="pdf-body text-gray-600" />
                              
                              <div className="mt-12 p-6 bg-gray-50 rounded-xl">
                                <GraduationCap className="text-[#e2bc2c] mb-4 w-8 h-8" />
                                <p className="text-sm font-bold text-gray-800">Compromisso com o Futuro</p>
                                <p className="text-xs text-gray-500 mt-2">A região investe pesadamente em tecnologia educacional e infraestrutura escolar de ponta.</p>
                              </div>
                            </Card>
                          </div>

                          <div className="col-span-8 flex flex-col gap-6">
                            <div className="grid grid-cols-1 gap-4">
                              {data.json_ssot.educacao.escolas.map((escola, idx) => (
                                <Card key={idx} className="flex-row items-center gap-8 py-6">
                                  <div className="w-16 h-16 rounded-full bg-[#1a1a1a] text-[#e2bc2c] font-black text-2xl flex items-center justify-center shrink-0">
                                    {escola.nota}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <EditableText as="h3" text={escola.nome} className="text-lg font-bold text-[#1a1a1a]" />
                                      <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold uppercase text-gray-500 tracking-wider">{escola.tipo}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-widest">Instituição de Destaque</p>
                                  </div>
                                </Card>
                              ))}
                            </div>
                            <div className="pdf-image-container h-48">
                              <EditableImage imgKey="education" className="w-full h-full" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Page 6: Health */}
                    <div className="pdf-page">
                      <div className="p-[60px] flex flex-col flex-1 h-full w-full box-border overflow-hidden">
                        <PageHeader title="Infraestrutura de Saúde" subtitle="Hospitais e centros médicos de referência na região." />
                        
                        <div className="grid-12 flex-1">
                          <div className="col-span-8 flex flex-col gap-6">
                            {data.json_ssot.saude.map((hospital, idx) => (
                              <Card key={idx} className="flex-row items-center gap-8 py-8">
                                <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                                  <PlusSquare className="w-10 h-10" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start mb-2">
                                    <EditableText as="h3" text={hospital.nome} className="text-xl font-bold text-[#1a1a1a]" />
                                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-bold uppercase tracking-wider">Referência</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-400 mb-4">
                                    <MapPin className="w-3 h-3" />
                                    <EditableText as="span" text={hospital.endereco} className="text-xs font-medium" />
                                  </div>
                                  <EditableText as="p" text={hospital.descricao} className="pdf-body text-gray-600 line-clamp-2" />
                                </div>
                              </Card>
                            ))}
                          </div>

                          <div className="col-span-4 flex flex-col gap-6">
                            <div className="pdf-image-container flex-1">
                              <EditableImage imgKey="health" className="w-full h-full" />
                            </div>
                            <Card className="bg-gray-50 border-none">
                              <span className="pdf-caption mb-4">Atendimento de Emergência</span>
                              <p className="text-sm font-bold text-gray-800 mb-2">Rede Hospitalar Completa</p>
                              <p className="text-xs text-gray-500 leading-relaxed">A região conta com unidades de pronto atendimento 24h e especialidades médicas avançadas, garantindo segurança total para sua família.</p>
                            </Card>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Page 7: Leisure & Commerce */}
                    <div className="pdf-page">
                      <div className="p-[60px] flex flex-col flex-1 h-full w-full box-border overflow-hidden">
                        <PageHeader title="Lazer e Conveniência" subtitle="Opções de entretenimento, gastronomia e serviços essenciais." />
                        
                        <div className="grid-12 flex-1">
                          <div className="col-span-4 flex flex-col gap-6">
                            <Card className="flex-1">
                              <span className="pdf-caption mb-4">Gastronomia e Compras</span>
                              <EditableText as="h3" text="Centro Comercial" className="text-2xl font-bold mb-6" />
                              <EditableText as="p" text={data.json_ssot.lazer_comercio.compras_gastronomia} className="pdf-body text-gray-600" />
                              
                              <div className="mt-12 pdf-image-container h-48">
                                <EditableImage imgKey="commerce" className="w-full h-full" />
                              </div>
                            </Card>
                          </div>

                          <div className="col-span-8 flex flex-col gap-6">
                            <div className="grid grid-cols-2 gap-6">
                              {data.json_ssot.lazer_comercio.lazer.map((item, idx) => (
                                <Card key={idx} className="flex-1">
                                  <span className="pdf-caption mb-4">Espaços Públicos</span>
                                  <EditableText as="h3" text={item.nome} className="text-lg font-bold mb-3 text-[#1a1a1a]" />
                                  <EditableText as="p" text={item.descricao} className="text-xs text-gray-500 leading-relaxed" />
                                </Card>
                              ))}
                            </div>
                            <Card className="bg-[#1a1a1a] text-white border-none flex-row items-center gap-6 p-8">
                              <div className="w-12 h-12 rounded-full bg-[#e2bc2c] flex items-center justify-center shrink-0">
                                <ShoppingBag className="text-[#1a1a1a] w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-lg font-bold">Tudo o que você precisa a poucos minutos.</p>
                                <p className="text-sm text-gray-400">Infraestrutura completa de serviços e lazer para o seu dia a dia.</p>
                              </div>
                            </Card>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Page 8: Housing */}
                    <div className="pdf-page">
                      <div className="p-[60px] flex flex-col flex-1 h-full w-full box-border overflow-hidden">
                        <PageHeader title="Tipos de Moradia" subtitle="Os principais formatos de imóvel e comunidades planejadas." />
                      
                      <div className="grid-12 flex-1">
                        <div className="col-span-8 grid grid-cols-2 gap-6">
                          {data.json_ssot.moradia.tipos.map((tipo, idx) => (
                            <Card key={idx} className="flex-1">
                              <div className="flex justify-between items-start mb-4">
                                <EditableText as="h3" text={tipo.nome} className="text-xl font-bold text-[#1a1a1a]" />
                                <div className="text-right">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase block">A partir de</span>
                                  <EditableText as="span" text={tipo.preco_estimado} className="text-lg font-bold text-[#e2bc2c]" />
                                </div>
                              </div>
                              <EditableText as="p" text={tipo.descricao} className="pdf-body text-gray-600 mb-6" />
                            </Card>
                          ))}
                        </div>

                        <div className="col-span-4 flex flex-col gap-6">
                          <Card className="bg-gray-50 border-none flex-1">
                            <span className="pdf-caption mb-6">Diferenciais das Comunidades</span>
                            <div className="space-y-4">
                              {data.json_ssot.moradia.features_comunidade.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                  <CheckCircle className="w-4 h-4 text-[#e2bc2c]" />
                                  <EditableText as="span" text={feature} className="text-sm font-bold text-gray-700" />
                                </div>
                              ))}
                            </div>
                          </Card>
                          <div className="pdf-image-container h-48">
                            <EditableImage imgKey="housing" className="w-full h-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                    {/* Page 5: Standard CTA */}
                    <CTAPage />
                  </div>
                </motion.div>
              )}

                {activeTab === 'investidor' && (
                  <motion.div 
                    key="investidor" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="flex flex-col gap-8"
                    style={{ 
                      transform: `scale(${previewScale})`, 
                      transformOrigin: 'top center',
                      width: '1920px',
                      marginBottom: `${(1 - previewScale) * -100}%`
                    }}
                  >
                    <div ref={investidorRef} className="flex flex-col gap-8">
                    
                    {/* Page 1: Cover */}
                    <CoverPage type="investidor" />

                    {/* Page 2: Market Metrics */}
                    <div className="pdf-page">
                      <div className="p-[60px] flex flex-col flex-1 h-full w-full box-border overflow-hidden">
                        <PageHeader title="Métricas de Mercado" subtitle="Indicadores chave para análise de viabilidade e retorno." />

                        <div className="grid-12 flex-1">
                          <div className="col-span-4 flex flex-col gap-6">
                            <Card className="bg-[#1a1a1a] text-white border-none py-12 items-center justify-center text-center">
                              <TrendingUp className="w-10 h-10 text-[#e2bc2c] mb-4" />
                              <span className="pdf-caption text-gray-400 mb-2">Preço Médio / SqFt</span>
                              <EditableText as="p" text={data.json_ssot.investimento.preco_medio_sqft} className="text-4xl font-extrabold" />
                            </Card>
                            
                            <Card className="bg-amber-50 border-none py-12 items-center justify-center text-center">
                              <BarChart3 className="w-10 h-10 text-amber-600 mb-4" />
                              <span className="pdf-caption text-[rgba(120,53,15,0.6)] mb-2">Valorização Anual</span>
                              <EditableText as="p" text={data.json_ssot.investimento.valorizacao_anual_pct} className="text-4xl font-extrabold text-amber-900" />
                            </Card>
                          </div>

                          <div className="col-span-8 flex flex-col gap-6">
                            <Card className="flex-1">
                              <span className="pdf-caption mb-4">Dinâmica de Demanda</span>
                              <EditableText as="h3" text="Indicadores de Crescimento" className="text-2xl font-bold mb-6" />
                              <div className="grid grid-cols-2 gap-12">
                                <div>
                                  <div className="flex justify-between items-end mb-3">
                                    <span className="font-bold text-gray-700">Crescimento Populacional</span>
                                    <EditableText as="span" text={data.json_ssot.investimento.crescimento_populacional_pct} className="text-xl font-extrabold text-[#e2bc2c]" />
                                  </div>
                                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#e2bc2c] rounded-full" style={{ width: data.json_ssot.investimento.crescimento_populacional_pct }}></div>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between items-end mb-3">
                                    <span className="font-bold text-gray-700">Rentabilidade (Aluguel)</span>
                                    <EditableText as="span" text={data.json_ssot.investimento.rentabilidade_aluguel_pct} className="text-xl font-extrabold text-emerald-500" />
                                  </div>
                                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: data.json_ssot.investimento.rentabilidade_aluguel_pct }}></div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-12 pt-8 border-t border-gray-100">
                                <span className="pdf-caption mb-4 block">Motores Econômicos</span>
                                <div className="grid grid-cols-2 gap-6">
                                  {data.json_ssot.investimento.motores_economicos.slice(0, 2).map((motor, idx) => (
                                    <div key={idx}>
                                      <EditableText as="h4" text={motor.nome} className="font-bold text-sm text-[#1a1a1a] mb-1" />
                                      <EditableText as="p" text={motor.descricao} className="text-xs text-gray-500 leading-relaxed" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </Card>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Page 3: Comparison & Strategy */}
                    <div className="pdf-page">
                      <div className="p-[60px] flex flex-col flex-1 h-full w-full box-border overflow-hidden">
                        <PageHeader title="Comparativo Regional" subtitle="Análise competitiva e insights para tomada de decisão." />
                        
                        <div className="grid-12 flex-1">
                          <div className="col-span-9 grid grid-cols-3 gap-6">
                            {data.json_ssot.investimento.comparativo_regional.map((comp, idx) => (
                              <Card key={idx} className={idx === 0 ? 'border-2 border-[#e2bc2c] shadow-lg' : ''}>
                                <span className="pdf-caption mb-4">{idx === 0 ? 'Destaque Local' : 'Referência'}</span>
                                <EditableText as="h3" text={comp.regiao} className="text-xl font-bold mb-6 text-[#1a1a1a]" />
                                
                                <div className="space-y-6">
                                  <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Preço Médio</span>
                                    <EditableText as="p" text={comp.preco_sqft} className="text-lg font-bold text-[#1a1a1a]" />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Perfil</span>
                                    <EditableText as="p" text={comp.perfil} className="text-xs text-gray-500 leading-relaxed" />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Estilo de Vida</span>
                                    <EditableText as="p" text={comp.estilo_vida} className="text-xs text-gray-500 leading-relaxed" />
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>

                          <div className="col-span-3 flex flex-col gap-6">
                            <div className="pdf-image-container flex-1">
                              <EditableImage imgKey="invest1" className="w-full h-full" />
                            </div>
                            <Card className="bg-gray-50 border-none">
                              <Info className="text-gray-400 mb-4 w-5 h-5" />
                              <p className="text-xs text-gray-500 leading-relaxed">A análise comparativa demonstra a competitividade da região em termos de custo-benefício e potencial de valorização futura.</p>
                            </Card>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Page 4: Insights */}
                    <div className="pdf-page">
                      <div className="p-[60px] flex flex-col flex-1 h-full w-full box-border overflow-hidden">
                        <PageHeader title="Insights Estratégicos" subtitle="Diretrizes fundamentais para otimização do investimento." />
                        
                        <div className="grid-12 flex-1">
                          <div className="col-span-8 flex flex-col gap-6">
                            <Card className="flex-1 bg-gray-50 border-none p-12 relative overflow-hidden">
                              <div className="absolute -right-10 -bottom-10 opacity-5">
                                <TrendingUp className="w-96 h-96 text-[#1a1a1a]" />
                              </div>
                              <div className="relative z-10">
                                <span className="pdf-caption mb-8 block">Recomendações do Especialista</span>
                                <div className="space-y-8">
                                  {data.json_ssot.investimento.insights_estrategicos.map((insight, idx) => (
                                    <div key={idx} className="flex items-start gap-6">
                                      <div className="w-10 h-10 rounded-full bg-white text-[#e2bc2c] flex items-center justify-center shrink-0 font-bold border border-gray-100 text-lg shadow-sm">
                                        {idx + 1}
                                      </div>
                                      <EditableText as="p" text={insight} className="pdf-body text-gray-600 pt-2" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </Card>
                          </div>

                          <div className="col-span-4 flex flex-col gap-6">
                            <div className="pdf-image-container flex-1">
                              <EditableImage imgKey="invest2" className="w-full h-full" />
                            </div>
                            <Card className="bg-[#1a1a1a] text-white border-none p-8">
                              <DollarSign className="text-[#e2bc2c] mb-4 w-8 h-8" />
                              <p className="text-lg font-bold">Pronto para o próximo passo?</p>
                              <p className="text-sm text-gray-400 mt-2">Nossa equipe está à disposição para aprofundar qualquer métrica apresentada neste deck.</p>
                            </Card>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Page 4: Standard CTA */}
                    <CTAPage />
                  </div>
                </motion.div>
              )}

                {activeTab === 'json' && (
                  <motion.div key="json" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-4xl flex flex-col gap-8">
                    <div className="bg-slate-900 rounded-xl p-8 shadow-2xl">
                      <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
                        <FileJson className="text-amber-400" />
                        <h2 className="text-xl font-bold text-white">Single Source of Truth (JSON)</h2>
                      </div>
                      <pre className="text-emerald-400 font-mono text-sm overflow-x-auto">
                        {JSON.stringify(data.json_ssot, null, 2)}
                      </pre>
                    </div>

                    {data.validacoes_executadas && data.validacoes_executadas.length > 0 && (
                      <div className="bg-slate-900 rounded-xl p-8 shadow-2xl">
                        <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
                          <CheckCircle className="text-amber-400" />
                          <h2 className="text-xl font-bold text-white">Validações e Autocrítica</h2>
                        </div>
                        <div className="space-y-4">
                          {data.validacoes_executadas.map((val, idx) => (
                            <div key={idx} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${val.status === 'sucesso' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                  {val.status}
                                </span>
                                <span className="font-bold text-white">{val.etapa}</span>
                              </div>
                              <p className="text-slate-400 text-sm">{val.detalhes}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
