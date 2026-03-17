import { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, Download, FileJson, CheckCircle, FileText, TrendingUp, MapPin, Users, GraduationCap, HeartPulse, Home, Briefcase, DollarSign, BarChart3, Image as ImageIcon, Edit3, Building } from 'lucide-react';
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
  const [images, setImages] = useState<Record<string, string>>(DEFAULT_IMAGES);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const residencialRef = useRef<HTMLDivElement>(null);
  const investidorRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!region) return;
    setLoading(true);
    setData(null);

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

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: jsonSchema
        }
      });

      setLoadingStep('Renderizando estúdio de edição...');
      
      if (response.text) {
        const parsedData = JSON.parse(response.text) as AppState;
        setData(parsedData);
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setLoadingStep('Erro ao gerar os dados. Por favor, tente novamente.');
      // Keep the error message visible for a few seconds before clearing loading state
      await new Promise(resolve => setTimeout(resolve, 3000));
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

    setIsGeneratingPDF(true);
    // Allow UI to update before heavy processing
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const pages = container.querySelectorAll('.pdf-page');
      const pdf = new jsPDF('p', 'mm', 'a4');

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }

      pdf.save(`Relatorio_${type}_${data?.json_ssot.regiao.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // alert('Erro ao gerar o PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // --- Reusable Components for the Studio ---
  const EditableText = ({ text, className, as: Component = 'div' }: { text: string, className?: string, as?: any }) => (
    <Component 
      contentEditable 
      suppressContentEditableWarning 
      className={`outline-none hover:ring-2 hover:ring-amber-400/50 transition-all rounded px-1 -mx-1 ${className}`}
    >
      {text}
    </Component>
  );

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
    <div className="pdf-page bg-white p-0 flex flex-row">
      <div className="w-1/2 p-16 flex flex-col justify-center relative">
        <EditableText as="h1" text={data!.json_ssot.capa.titulo} className="text-[64px] font-bold text-[#1a1a1a] mb-4 leading-[1.1] tracking-tight" />
        <EditableText as="h2" text={type === 'residencial' ? 'Guia da Região' : 'Relatório de Investimento'} className="text-3xl font-bold text-[#e2bc2c] mb-12" />
        
        <div className="border-l-4 border-[#e2bc2c] pl-6 py-2 mb-16">
          <EditableText as="p" text={data!.json_ssot.capa.descricao} className="text-lg text-gray-500 leading-relaxed" />
        </div>

        <div className="absolute bottom-16 left-16 flex items-center gap-4 text-sm text-gray-400 font-medium tracking-widest uppercase">
          <span>{type === 'residencial' ? 'Florida Relocation Guide' : 'Investment Report'}</span>
          <span className="text-[#e2bc2c]">|</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </div>
      <div className="w-1/2 relative">
        <EditableImage imgKey={type === 'residencial' ? 'coverRes' : 'coverInv'} className="absolute inset-0 h-full" />
      </div>
    </div>
  );

  const PageHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <div className="mb-10 shrink-0">
      <div className="w-16 h-1 bg-[#e2bc2c] mb-4"></div>
      <EditableText as="h2" text={title} className="text-3xl font-bold text-[#1a1a1a] uppercase tracking-tight" />
      <EditableText as="p" text={subtitle} className="text-gray-600 mt-2 text-lg" />
    </div>
  );

  const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  );

  const CTAPage = () => (
    <div className="pdf-page p-0 flex flex-row">
      <div className="w-1/2 bg-white p-16 flex flex-col justify-center relative">
        <div className="w-12 h-1 bg-[#e2bc2c] mb-8"></div>
        <EditableText as="h2" text="PRÓXIMO PASSO:" className="text-5xl font-bold text-[#1a1a1a] mb-2" />
        <EditableText as="h2" text={data!.json_ssot.cta.titulo} className="text-5xl font-bold text-[#e2bc2c] mb-8" />
        <EditableText as="p" text={data!.json_ssot.cta.texto} className="text-xl text-gray-600 leading-relaxed mb-12" />
        
        {data!.json_ssot.fontes && data!.json_ssot.fontes.length > 0 && (
          <div className="mt-auto border-t border-gray-200 pt-8">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Metodologia e Fontes</h3>
            <div className="space-y-3">
              {data!.json_ssot.fontes.map((fonte, idx) => (
                <div key={idx} className="text-[10px] leading-tight">
                  <span className="text-[#e2bc2c] font-bold">{fonte.nome}: </span>
                  <span className="text-gray-500">{fonte.descricao} </span>
                  <span className="text-gray-400 italic break-all">({fonte.url})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="w-1/2 bg-[#e2bc2c] p-16 flex flex-col justify-center">
        <h3 className="text-[#1a1a1a] font-bold uppercase tracking-wider text-sm mb-4">Pronto para o próximo passo?</h3>
        <h2 className="text-5xl font-bold text-[#1a1a1a] mb-12">Agende sua<br/>Reunião</h2>
        
        <div className="space-y-4 mb-16">
          <div className="bg-[rgba(255,255,255,0.3)] p-5 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-[#1a1a1a] rounded-full flex items-center justify-center text-[#e2bc2c] shrink-0"><CheckCircle className="w-6 h-6" /></div>
            <div>
              <span className="block font-bold text-[#1a1a1a] text-lg">Reunião por Vídeo</span>
              <span className="block text-sm text-[rgba(26,26,26,0.8)]">Google Meet ou Zoom, no seu horário</span>
            </div>
          </div>
          <div className="bg-[rgba(255,255,255,0.3)] p-5 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-[#1a1a1a] rounded-full flex items-center justify-center text-[#e2bc2c] shrink-0"><CheckCircle className="w-6 h-6" /></div>
            <div>
              <span className="block font-bold text-[#1a1a1a] text-lg">30 a 45 minutos</span>
              <span className="block text-sm text-[rgba(26,26,26,0.8)]">Conversa objetiva e direta</span>
            </div>
          </div>
          <div className="bg-[rgba(255,255,255,0.3)] p-5 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-[#1a1a1a] rounded-full flex items-center justify-center text-[#e2bc2c] shrink-0"><CheckCircle className="w-6 h-6" /></div>
            <div>
              <span className="block font-bold text-[#1a1a1a] text-lg">Em Português</span>
              <span className="block text-sm text-[rgba(26,26,26,0.8)]">Atendimento 100% em português</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] text-white text-center py-5 rounded-xl font-bold cursor-pointer hover:bg-black transition-colors text-lg">
          Entre em contato para agendar sua reunião
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
            <div className="bg-[rgba(226,232,240,0.5)] p-8 rounded-2xl overflow-x-auto flex flex-col items-center gap-8 min-h-[80vh]">
              <AnimatePresence mode="wait">
                {activeTab === 'residencial' && (
                  <motion.div key="residencial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-8" ref={residencialRef}>
                    
                    {/* Page 1: Cover */}
                    <CoverPage type="residencial" />

                    {/* Page 2: Location */}
                    <div className="pdf-page">
                      <PageHeader title="Localização e Distâncias" subtitle="Conheça o posicionamento estratégico e a conectividade da região." />
                      
                      <div className="grid grid-cols-2 gap-8 pdf-page-content">
                        <div className="flex flex-col gap-8">
                          <Card>
                            <h3 className="text-xl font-bold text-[#1a1a1a] flex items-center gap-2 mb-4">
                              <MapPin className="text-[#e2bc2c]" /> Onde fica
                            </h3>
                            <div className="text-block max-h-[150px]">
                              <EditableText as="p" text={data.json_ssot.localizacao.descricao} className="text-gray-600 leading-relaxed" />
                            </div>
                          </Card>
                          
                          <Card className="bg-gray-50">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Cidades Vizinhas</h4>
                            <div className="grid grid-cols-2 gap-6 text-sm font-medium text-gray-700">
                              <div><span className="text-[#e2bc2c] mr-2">↑</span>Norte: <EditableText as="span" text={data.json_ssot.localizacao.vizinhas.norte} /></div>
                              <div><span className="text-[#e2bc2c] mr-2">→</span>Leste: <EditableText as="span" text={data.json_ssot.localizacao.vizinhas.leste} /></div>
                              <div><span className="text-[#e2bc2c] mr-2">←</span>Oeste: <EditableText as="span" text={data.json_ssot.localizacao.vizinhas.oeste} /></div>
                              <div><span className="text-[#e2bc2c] mr-2">↓</span>Sul: <EditableText as="span" text={data.json_ssot.localizacao.vizinhas.sul} /></div>
                            </div>
                          </Card>
                        </div>

                        <div className="flex flex-col gap-8">
                          <Card>
                            <h3 className="text-xl font-bold text-[#1a1a1a] mb-6">Distâncias e Tempos</h3>
                            <div className="space-y-6">
                              {data.json_ssot.localizacao.distancias.map((dist, idx) => (
                                <div key={idx}>
                                  <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                                    <EditableText as="span" text={dist.local} />
                                    <EditableText as="span" text={`${dist.milhas} mi / ${dist.tempo_min} min`} />
                                  </div>
                                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#e2bc2c] rounded-full" style={{ width: `${Math.max(20, 100 - (parseInt(dist.tempo_min) * 1.5))}%` }}></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </div>
                      </div>
                      <div className="mt-8 h-[300px] w-full rounded-xl overflow-hidden shadow-sm">
                        <EditableImage imgKey="map" className="w-full h-full" />
                      </div>
                    </div>

                    {/* Page 3: Demographics */}
                    <div className="pdf-page">
                      <PageHeader title="Perfil Demográfico" subtitle="Comunidade diversificada e indicadores socioeconômicos." />
                      
                      <div className="grid grid-cols-2 gap-8 mb-8">
                        <Card className="text-center flex flex-col items-center justify-center py-10">
                          <Users className="w-8 h-8 text-[#e2bc2c] mb-4" />
                          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">População Total</p>
                          <EditableText as="p" text={data.json_ssot.demografia.populacao} className="text-4xl font-bold text-[#1a1a1a]" />
                        </Card>
                        
                        <Card className="text-center flex flex-col items-center justify-center py-10">
                          <DollarSign className="w-8 h-8 text-[#e2bc2c] mb-4" />
                          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Renda Média Familiar</p>
                          <EditableText as="p" text={data.json_ssot.demografia.renda_media} className="text-4xl font-bold text-[#1a1a1a]" />
                        </Card>
                      </div>

                      <div className="grid grid-cols-2 gap-8 mb-8">
                        <Card>
                          <h3 className="text-lg font-bold text-[#1a1a1a] mb-6">Educação e Trabalho</h3>
                          <div className="space-y-6">
                            <div>
                              <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                                <span>Ensino Superior</span>
                                <EditableText as="span" text={data.json_ssot.demografia.escolaridade_superior_pct} />
                              </div>
                              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#e2bc2c] rounded-full w-[60%]"></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                                <span>Trabalho Remoto</span>
                                <EditableText as="span" text={data.json_ssot.demografia.trabalho_remoto_pct} />
                              </div>
                              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#1a1a1a] rounded-full w-[30%]"></div>
                              </div>
                            </div>
                          </div>
                        </Card>

                        <Card className="bg-gray-50">
                          <h3 className="text-lg font-bold text-[#e2bc2c] mb-4">Diversidade e Origem</h3>
                          <div className="text-block max-h-[150px]">
                            <EditableText as="p" text={data.json_ssot.demografia.diversidade_texto} className="text-gray-600 leading-relaxed" />
                          </div>
                        </Card>
                      </div>

                      <Card>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Perfil Predominante</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {data.json_ssot.demografia.perfis_predominantes.map((perfil, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <CheckCircle className="w-5 h-5 text-[#e2bc2c]" />
                              <EditableText as="span" text={perfil} className="font-bold text-[#1a1a1a]" />
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>

                    {/* Page 4: Lifestyle */}
                    <div className="pdf-page">
                      <PageHeader title="Estilo de Vida e Qualidade de Moradia" subtitle="Ambiente focado em infraestrutura, saúde e bem-estar." />
                      
                      <div className="grid grid-cols-2 gap-8 mb-8">
                        {data.json_ssot.estilo_vida.map((item, idx) => (
                          <Card key={idx}>
                            <EditableText as="h3" text={item.titulo} className="text-xl font-bold text-[#1a1a1a] mb-3" />
                            <div className="text-block max-h-[120px]">
                              <EditableText as="p" text={item.descricao} className="text-gray-600 leading-relaxed" />
                            </div>
                          </Card>
                        ))}
                      </div>
                      
                      <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-sm">
                        <EditableImage imgKey="lifestyle" className="w-full h-full" />
                      </div>
                    </div>

                    {/* Page 5: Education */}
                    <div className="pdf-page">
                      <PageHeader title="Educação Pública" subtitle="Escolas e instituições de ensino que atendem a região." />
                      
                      <div className="mb-8 text-block max-h-[100px]">
                        <EditableText as="p" text={data.json_ssot.educacao.descricao} className="text-xl text-gray-600 leading-relaxed" />
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {data.json_ssot.educacao.escolas.map((escola, idx) => (
                          <Card key={idx} className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-[#e2bc2c] text-[#1a1a1a] font-bold text-2xl flex items-center justify-center shrink-0 shadow-md">
                              {escola.nota}
                            </div>
                            <div className="flex-1">
                              <EditableText as="h3" text={escola.nome} className="text-xl font-bold text-[#1a1a1a] mb-1" />
                              <EditableText as="p" text={escola.tipo} className="text-gray-500 font-medium" />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Page 6: Health */}
                    <div className="pdf-page">
                      <PageHeader title="Infraestrutura de Saúde" subtitle="Hospitais e centros médicos de referência na região." />
                      
                      <div className="grid grid-cols-1 gap-8 mb-8">
                        {data.json_ssot.saude.map((hospital, idx) => (
                          <Card key={idx} className="border-l-8 border-[#e2bc2c]">
                            <EditableText as="h3" text={hospital.nome} className="text-2xl font-bold text-[#1a1a1a] mb-2" />
                            <EditableText as="p" text={hospital.endereco} className="text-gray-500 font-medium mb-4 flex items-center gap-2">
                              <MapPin className="w-4 h-4" /> {hospital.endereco}
                            </EditableText>
                            <div className="text-block max-h-[150px]">
                              <EditableText as="p" text={hospital.descricao} className="text-gray-600 leading-relaxed" />
                            </div>
                          </Card>
                        ))}
                      </div>
                      
                      <div className="h-[350px] w-full rounded-xl overflow-hidden shadow-sm">
                        <EditableImage imgKey="health" className="w-full h-full" />
                      </div>
                    </div>

                    {/* Page 7: Leisure & Commerce */}
                    <div className="pdf-page">
                      <PageHeader title="Lazer, Comércio e Gastronomia" subtitle="Opções de entretenimento e conveniência do dia a dia." />
                      
                      <div className="grid grid-cols-2 gap-8 h-full">
                        <div className="flex flex-col gap-8">
                          <h3 className="text-2xl font-bold text-[#1a1a1a] border-b-4 border-[#e2bc2c] pb-2 inline-block self-start">Lazer e Bem-Estar</h3>
                          {data.json_ssot.lazer_comercio.lazer.map((item, idx) => (
                            <Card key={idx}>
                              <EditableText as="h4" text={item.nome} className="text-lg font-bold text-[#1a1a1a] mb-2" />
                              <div className="text-block max-h-[100px]">
                                <EditableText as="p" text={item.descricao} className="text-gray-600 leading-relaxed" />
                              </div>
                            </Card>
                          ))}
                        </div>
                        
                        <div className="flex flex-col gap-8">
                          <h3 className="text-2xl font-bold text-[#1a1a1a] border-b-4 border-[#e2bc2c] pb-2 inline-block self-start">Comércio e Gastronomia</h3>
                          <Card className="bg-gray-50 flex-1">
                            <div className="text-block">
                              <EditableText as="p" text={data.json_ssot.lazer_comercio.compras_gastronomia} className="text-gray-600 leading-relaxed text-lg" />
                            </div>
                          </Card>
                          <div className="h-[250px] w-full rounded-xl overflow-hidden shadow-sm">
                            <EditableImage imgKey="commerce" className="w-full h-full" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Page 8: Housing */}
                    <div className="pdf-page">
                      <PageHeader title="Tipos de Moradia e Comunidades" subtitle="Os principais formatos de imóvel disponíveis na região." />
                      
                      <div className="grid grid-cols-2 gap-8 mb-8">
                        {data.json_ssot.moradia.tipos.map((tipo, idx) => (
                          <Card key={idx}>
                            <EditableText as="h3" text={tipo.nome} className="text-xl font-bold text-[#1a1a1a] mb-3" />
                            <div className="text-block max-h-[120px] mb-4">
                              <EditableText as="p" text={tipo.descricao} className="text-gray-600 leading-relaxed" />
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg inline-block">
                              <span className="text-xs text-gray-500 uppercase font-bold block mb-1">A partir de</span>
                              <EditableText as="p" text={tipo.preco_estimado} className="text-lg font-bold text-[#e2bc2c]" />
                            </div>
                          </Card>
                        ))}
                      </div>

                      <Card className="bg-gray-50 mb-8">
                        <h3 className="text-lg font-bold text-[#e2bc2c] mb-6">Diferenciais das Comunidades Planejadas</h3>
                        <div className="grid grid-cols-3 gap-6">
                          {data.json_ssot.moradia.features_comunidade.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <CheckCircle className="w-5 h-5 text-[#e2bc2c] shrink-0" />
                              <EditableText as="span" text={feature} className="font-medium text-[#1a1a1a]" />
                            </div>
                          ))}
                        </div>
                      </Card>
                      
                      <div className="h-[200px] w-full rounded-xl overflow-hidden shadow-sm">
                        <EditableImage imgKey="housing" className="w-full h-full" />
                      </div>
                    </div>

                    {/* Page 5: Standard CTA */}
                    <CTAPage />

                  </motion.div>
                )}

                {activeTab === 'investidor' && (
                  <motion.div key="investidor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-8" ref={investidorRef}>
                    
                    {/* Page 1: Cover */}
                    <CoverPage type="investidor" />

                    {/* Page 2: Market Metrics */}
                    <div className="pdf-page">
                      <PageHeader title="Métricas de Mercado e Demanda" subtitle="Indicadores chave para análise de viabilidade e retorno." />

                      <div className="grid grid-cols-3 gap-6 mb-8">
                        <Card className="bg-white text-center border-b-4 border-[#e2bc2c]">
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Preço Médio / SqFt</p>
                          <EditableText as="p" text={data.json_ssot.investimento.preco_medio_sqft} className="text-3xl font-bold text-[#1a1a1a]" />
                        </Card>
                        <Card className="bg-white text-center border-b-4 border-[#e2bc2c]">
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Valorização Anual</p>
                          <EditableText as="p" text={data.json_ssot.investimento.valorizacao_anual_pct} className="text-3xl font-bold text-[#e2bc2c]" />
                        </Card>
                        <Card className="bg-white text-center border-b-4 border-[#e2bc2c]">
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Rentabilidade (Aluguel)</p>
                          <EditableText as="p" text={data.json_ssot.investimento.rentabilidade_aluguel_pct} className="text-3xl font-bold text-emerald-500" />
                        </Card>
                      </div>

                      <div className="grid grid-cols-2 gap-8 flex-1">
                        <div className="flex flex-col gap-8">
                          <Card>
                            <h3 className="text-xl font-bold text-[#1a1a1a] border-b-2 border-[#e2bc2c] pb-2 mb-6 inline-flex items-center gap-2"><BarChart3 className="text-[#e2bc2c]" /> Indicadores de Demanda</h3>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                <span className="text-gray-600 font-medium">Crescimento Populacional</span>
                                <EditableText as="span" text={data.json_ssot.investimento.crescimento_populacional_pct} className="font-bold text-[#1a1a1a] text-lg" />
                              </div>
                              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                <span className="text-gray-600 font-medium">Taxa de Vacância</span>
                                <EditableText as="span" text={data.json_ssot.investimento.taxa_vacancia_pct} className="font-bold text-[#1a1a1a] text-lg" />
                              </div>
                            </div>
                          </Card>

                          <Card>
                            <h3 className="text-xl font-bold text-[#1a1a1a] border-b-2 border-[#e2bc2c] pb-2 mb-6 inline-flex items-center gap-2"><Briefcase className="text-[#e2bc2c]" /> Motores Econômicos</h3>
                            <div className="space-y-4">
                              {data.json_ssot.investimento.motores_economicos.map((motor, idx) => (
                                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                  <EditableText as="h4" text={motor.nome} className="font-bold text-[#1a1a1a] text-sm mb-1" />
                                  <EditableText as="p" text={motor.descricao} className="text-xs text-gray-600" />
                                </div>
                              ))}
                            </div>
                          </Card>
                        </div>

                        <div className="flex flex-col gap-6">
                          <div className="h-[250px] w-full rounded-xl overflow-hidden shadow-sm">
                            <EditableImage imgKey="invest1" className="w-full h-full" />
                          </div>
                          <div className="h-[250px] w-full rounded-xl overflow-hidden shadow-sm">
                            <EditableImage imgKey="invest2" className="w-full h-full" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Page 3: Comparison & Insights */}
                    <div className="pdf-page">
                      <PageHeader title="Comparativo Regional e Estratégia" subtitle="Análise competitiva e insights para tomada de decisão." />

                      <div className="grid grid-cols-3 gap-6 mb-8">
                        {data.json_ssot.investimento.comparativo_regional.map((comp, idx) => (
                          <Card key={idx} className={idx === 0 ? 'bg-gray-50 border-[#e2bc2c] shadow-md' : 'bg-white'}>
                            {idx === 0 && <div className="text-[10px] font-bold text-[#e2bc2c] uppercase tracking-wider mb-2">Em Destaque</div>}
                            <EditableText as="h3" text={comp.regiao} className="text-xl font-bold text-[#1a1a1a] mb-4" />
                            
                            <div className="space-y-4">
                              <div>
                                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Preço Médio</p>
                                <EditableText as="p" text={comp.preco_sqft} className="text-sm font-bold text-[#1a1a1a]" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Perfil</p>
                                <EditableText as="p" text={comp.perfil} className="text-xs text-gray-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Estilo de Vida</p>
                                <EditableText as="p" text={comp.estilo_vida} className="text-xs text-gray-600" />
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      <Card className="bg-gray-50 flex-1 relative overflow-hidden">
                        <div className="absolute -right-10 -bottom-10 opacity-5">
                          <TrendingUp className="w-64 h-64 text-[#1a1a1a]" />
                        </div>
                        <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 relative z-10 text-[#1a1a1a]">
                          <div className="w-8 h-8 bg-[#e2bc2c] rounded-lg flex items-center justify-center text-[#1a1a1a]"><DollarSign className="w-5 h-5" /></div>
                          Insights Estratégicos
                        </h3>
                        <ul className="space-y-6 relative z-10">
                          {data.json_ssot.investimento.insights_estrategicos.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-4">
                              <div className="w-8 h-8 rounded-full bg-white text-[#e2bc2c] flex items-center justify-center shrink-0 font-bold border border-gray-200">
                                {idx + 1}
                              </div>
                              <EditableText as="p" text={insight} className="text-gray-600 leading-relaxed pt-1" />
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </div>

                    {/* Page 4: Standard CTA */}
                    <CTAPage />

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
