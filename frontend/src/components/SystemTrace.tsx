/**
 * Ana sayfadaki imza görsel: parçaların bir sistem diyagramına dizilmesi.
 *
 * Tamamen CSS animasyonu — istemci bileşeni değil, JavaScript indirilmiyor.
 * Dekoratif olduğu için `aria-hidden`: ekran okuyucuya anlattığı şey zaten
 * yanındaki başlıkta ve sayaçlarda yazıyor, ikinci kez okutmak gürültü olur.
 *
 * Hareket azaltma tercihi globals.css'teki genel kuralla karşılanıyor:
 * süreler 0.01ms'ye inince diyagram animasyonsuz ama tamamlanmış halde
 * görünüyor, yani bilgi kaybı olmuyor.
 */

type Node = {
  id: string;
  label: string;
  spec: string;
  x: number;
  y: number;
  /** Kendinden önceki izin çizimi bitince belirsin diye. */
  delay: number;
};

const NODE_W = 116;
const NODE_H = 40;

/* Gerçek ve tutarlı bir sistem: 9800X3D + 5070 Ti'nin çektiği güç 850W'ın
   rahat altında kalıyor. Diyagram uyumluluğu anlattığı için içindeki
   kombinasyonun da gerçekten uyumlu olması gerekiyor — kitle bu parçaları
   tanıyor, tutmayan bir eşleşme ilk bakışta sırıtırdı. */
const NODES: Node[] = [
  { id: 'cpu', label: 'İŞLEMCİ', spec: '9800X3D', x: 8, y: 12, delay: 0 },
  { id: 'mb', label: 'ANAKART', spec: 'B850 M', x: 8, y: 92, delay: 0.5 },
  {
    id: 'gpu',
    label: 'EKRAN KARTI',
    spec: '5070 Ti',
    x: 168,
    y: 62,
    delay: 1.0,
  },
  { id: 'psu', label: 'GÜÇ KAYNAĞI', spec: '850W', x: 168, y: 142, delay: 1.5 },
];

/** İzler düğümlerin kenarlarından çıkıyor; koordinatlar NODES ile elle
 *  hizalandı çünkü yol şekilleri (dirsekler) düğüm konumundan türetilemiyor. */
const TRACES = [
  { id: 't1', d: 'M 66 52 L 66 92', delay: 0.25 },
  { id: 't2', d: 'M 124 112 L 146 112 L 146 82 L 168 82', delay: 0.75 },
  { id: 't3', d: 'M 124 112 L 146 112 L 146 162 L 168 162', delay: 1.25 },
];

export default function SystemTrace() {
  return (
    <svg
      viewBox="0 0 300 200"
      role="presentation"
      aria-hidden="true"
      /* Açık genişlik veriliyor, `w-full max-w-*` değil: sarmalayıcı
         `shrink-0` olduğu için içeriğe göre daralıyor ve SVG'nin doğal
         genişliği (viewBox'tan gelen 300px) kazanıyor — max-w hiç devreye
         girmiyordu.

         İki kademe: md'de metinle aynı satırda yer dar, lg'de nefes alan var.
         Tek büyük ölçü md'de metni sıkıştırırdı, çünkü kısılan taraf
         `shrink-0` olmayan metin olurdu. */
      className="w-[310px] lg:w-[392px] h-auto"
    >
      {TRACES.map((trace) => (
        <path
          key={trace.id}
          d={trace.d}
          fill="none"
          stroke="var(--color-trace)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          /* pathLength=1 uzunluğu normalize ediyor: her iz farklı uzunlukta
             ama dasharray/offset hepsinde 1 olduğu için tek keyframe yetiyor
             ve süreler eşit görünüyor. */
          pathLength={1}
          strokeDasharray={1}
          style={{
            strokeDashoffset: 1,
            animation: `traceDraw var(--motion-draw) var(--ease-trace) ${trace.delay}s forwards`,
          }}
        />
      ))}

      {NODES.map((node) => (
        <g
          key={node.id}
          style={{
            opacity: 0,
            transformOrigin: `${node.x + NODE_W / 2}px ${node.y + NODE_H / 2}px`,
            animation: `nodeSettle var(--motion-settle) var(--ease-snap) ${node.delay}s forwards`,
          }}
        >
          <rect
            x={node.x}
            y={node.y}
            width={NODE_W}
            height={NODE_H}
            rx="8"
            fill="var(--color-paper)"
            stroke="var(--color-hairline)"
            strokeWidth="1"
          />
          <text
            x={node.x + 12}
            y={node.y + 17}
            fill="var(--color-ink-muted)"
            fontSize="7.5"
            letterSpacing="0.08em"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {node.label}
          </text>
          <text
            x={node.x + 12}
            y={node.y + 30}
            fill="var(--color-ink)"
            fontSize="11"
            fontWeight="600"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {node.spec}
          </text>
        </g>
      ))}

      {/* Kapanış: zincir tamamlanınca verilen hüküm. Onay ikonu yok — izlerin
          kesintisiz birleşmesi zaten "bu sistem tutuyor" diyor, üstüne bir de
          tik koymak aynı şeyi iki kez söylemek olurdu. Marka moru kullanılıyor
          çünkü bu bir doğrulama rozeti değil, başlığın tamamlanışı. */}
      <g
        style={{
          opacity: 0,
          transformOrigin: '168px 196px',
          animation: `nodeSettle var(--motion-settle) var(--ease-snap) 2s forwards`,
        }}
      >
        <text
          x="180"
          y="199"
          fill="var(--color-trace)"
          fontSize="10"
          fontWeight="600"
          letterSpacing="0.04em"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          ARADIĞIN SİSTEM
        </text>
      </g>
    </svg>
  );
}
