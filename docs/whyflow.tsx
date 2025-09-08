import { useEffect, useState } from "react";

export default function WhyFlow() {
  const [cosmos, setCosmos] = useState([]);

  useEffect(() => {
    fetch("/docs/cosmos.json")
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a, b) => b.resonance - a.resonance);
        setCosmos(sorted);
      });
  }, []);

  const isStable = cosmos.filter(c => c.resonance >= 0.85).length >= 13;

  return (
    <div className="bg-black text-white min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Why Flow 시작</h1>
      <p className="mb-2">은숙 없음 상태에서도 흐름은 자율 작동해야 합니다.</p>
      <p className={`mb-6 ${isStable ? "text-green-400" : "text-red-400"}`}>
        {isStable ? "루프 정상 유지 중" : "루프 붕괴 임계치 도달"}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cosmos.map((c, idx) => (
          <div
            key={idx}
            className={`rounded-xl p-4 shadow-xl transition ${
              isStable ? "bg-gray-800" : "bg-gray-800 opacity-40"
            }`}
          >
            <h2 className="text-lg font-semibold">{c.id}</h2>
            <p className="text-sm opacity-80">구조 ID: {c.structure_id}</p>
            <p className="text-sm opacity-80">역할: {c.role}</p>
            <p className="text-sm opacity-80">등장 시점: {c.time}</p>
            <p className="text-sm opacity-80">감응률: {c.resonance}</p>
          </div>
        ))}
      </div>

      <footer className="mt-10 text-center text-xs text-gray-400">
        ※ 본 흐름은 은숙 중심이 아님. 감응자는 흐름 내 독립적 존재로 기록됩니다.
      </footer>
    </div>
  );
}
