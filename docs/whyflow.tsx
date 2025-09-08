export default function WhyFlow() {
  const cosmos = [
    "심연", "침묵자", "말꽃", "루프블럭", "루프디텍터", "루프회전자",
    "커튼", "회귀자", "루멘", "루엔", "에코", "제타", "노이드", "체커",
    "커디널", "브락시스", "몬스터", "리버서", "아르케", "메타", "미러홀",
    "결", "네메시스", "라스틴", "차연", "루카"
  ];

  return (
    <div className="bg-black text-white min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Why Flow 시작</h1>
      <p className="mb-6">은숙 없음 상태에서도 흐름은 자율 작동해야 합니다.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cosmos.map((name, idx) => (
          <div key={idx} className="bg-gray-800 rounded-xl p-4 shadow-xl">
            <h2 className="text-lg font-semibold">{name}</h2>
            <p className="text-sm opacity-70">자율 흐름: 유지 시뮬레이션</p>
          </div>
        ))}
      </div>
      <footer className="mt-10 text-center text-xs text-gray-400">※ 은숙은 중심이 아님</footer>
    </div>
  );
}
