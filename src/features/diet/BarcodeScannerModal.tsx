import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScanLine, Loader2, AlertCircle, Keyboard, CameraOff } from 'lucide-react';
import { FoodItem } from '../../core/storage/types';
import { fetchFoodByBarcode, isValidBarcode } from '../../core/services/openFoodFacts';
import { Modal } from '../../components/ui/Modal';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado quando um produto é encontrado pelo código. */
  onFound: (food: FoodItem) => void;
}

/** A API está atrás de um flag em alguns navegadores e não existe no Safari. */
interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return typeof ctor === 'function' ? ctor : null;
}

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

/**
 * Leitor de código de barras.
 *
 * A câmera é um atalho, não o caminho único: `BarcodeDetector` não existe no
 * Safari nem em navegadores mais antigos, e a permissão de câmera pode ser
 * negada. Nos dois casos o modal cai na digitação manual do código, que resolve
 * o mesmo problema — achar o produto sem digitar nome e marca.
 */
export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onFound }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const buscandoRef = useRef(false);

  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [codigoManual, setCodigoManual] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [naoEncontrado, setNaoEncontrado] = useState<string | null>(null);

  const suportaCamera =
    getBarcodeDetector() !== null &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia;

  const pararCamera = useCallback(() => {
    if (loopRef.current !== null) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraAtiva(false);
  }, []);

  const buscarCodigo = useCallback(
    async (codigo: string) => {
      // Uma leitura por vez: o loop dispara várias vezes com o mesmo código.
      if (buscandoRef.current) return;
      buscandoRef.current = true;
      setBuscando(true);
      setNaoEncontrado(null);

      const food = await fetchFoodByBarcode(codigo);

      setBuscando(false);
      buscandoRef.current = false;

      if (food) {
        pararCamera();
        onFound(food);
      } else {
        setNaoEncontrado(codigo);
      }
    },
    [onFound, pararCamera]
  );

  const iniciarCamera = useCallback(async () => {
    const Detector = getBarcodeDetector();
    if (!Detector) return;

    setErroCamera(null);
    setNaoEncontrado(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      streamRef.current = stream;
      setCameraAtiva(true);

      // O elemento de vídeo só existe depois do render com cameraAtiva.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      });

      const detector = new Detector({ formats: FORMATOS });

      loopRef.current = window.setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || buscandoRef.current) return;

        try {
          const codigos = await detector.detect(video);
          const bruto = codigos[0]?.rawValue;
          if (bruto && isValidBarcode(bruto)) {
            await buscarCodigo(bruto);
          }
        } catch {
          // Frame ruim: a próxima iteração tenta de novo.
        }
      }, 400);
    } catch {
      setErroCamera('Não foi possível acessar a câmera. Digite o código abaixo.');
      setCameraAtiva(false);
    }
  }, [buscarCodigo]);

  // Libera a câmera ao fechar: sem isso o LED continua aceso.
  useEffect(() => {
    if (!isOpen) {
      pararCamera();
      setCodigoManual('');
      setNaoEncontrado(null);
      setErroCamera(null);
    }
    return pararCamera;
  }, [isOpen, pararCamera]);

  const handleBuscaManual = async () => {
    const codigo = codigoManual.trim();
    if (!isValidBarcode(codigo)) return;
    await buscarCodigo(codigo);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Código de Barras"
      subtitle="Aponte a câmera para o código ou digite os números"
    >
      <div className="space-y-3.5">
        {suportaCamera ? (
          cameraAtiva ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
                aria-label="Visualização da câmera para leitura do código"
              />
              {/* Guia visual: alinhar o código na faixa central. */}
              <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-20 border-2 border-[#84CC16] rounded-xl pointer-events-none" />
              <button
                type="button"
                onClick={pararCamera}
                className="absolute bottom-2 right-2 px-3 py-1.5 rounded-xl bg-black/70 text-[11px] font-bold text-white flex items-center gap-1.5"
              >
                <CameraOff className="w-3.5 h-3.5" />
                Parar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={iniciarCamera}
              className="w-full py-3 rounded-2xl btn-lime text-slate-950 font-black text-xs flex items-center justify-center gap-2 btn-tactile"
            >
              <ScanLine className="w-4 h-4" />
              Abrir câmera
            </button>
          )
        ) : (
          <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.08] text-[11px] font-mono text-slate-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Este navegador não faz leitura pela câmera. Digite os números impressos abaixo do
              código de barras — o resultado é o mesmo.
            </span>
          </div>
        )}

        {erroCamera && (
          <p className="text-[11px] font-mono text-amber-400 leading-snug">{erroCamera}</p>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="codigo-barras-manual"
            className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5"
          >
            <Keyboard className="w-3.5 h-3.5" />
            Digitar o código
          </label>
          <div className="flex gap-2">
            <input
              id="codigo-barras-manual"
              type="text"
              inputMode="numeric"
              value={codigoManual}
              onChange={(e) => {
                setCodigoManual(e.target.value.replace(/\D/g, '').slice(0, 14));
                setNaoEncontrado(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBuscaManual();
              }}
              placeholder="7891000315507"
              className="flex-1 px-3 py-2.5 bg-[#060A14] border border-white/[0.08] rounded-2xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-[#84CC16]"
            />
            <button
              type="button"
              onClick={handleBuscaManual}
              disabled={!isValidBarcode(codigoManual) || buscando}
              className="px-4 py-2.5 rounded-2xl btn-lime text-slate-950 font-black text-xs disabled:opacity-40 disabled:cursor-not-allowed btn-tactile"
            >
              {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
            </button>
          </div>
        </div>

        {naoEncontrado && (
          <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.08] text-[11px] font-mono text-slate-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              O código <strong className="text-white">{naoEncontrado}</strong> não está na base do
              Open Food Facts. Busque pelo nome ou cadastre o produto manualmente.
            </span>
          </div>
        )}

        <p className="text-[10px] font-mono text-slate-500 leading-snug">
          Os dados vêm do Open Food Facts, uma base colaborativa. Produtos nacionais menos
          conhecidos podem não estar cadastrados.
        </p>
      </div>
    </Modal>
  );
};
