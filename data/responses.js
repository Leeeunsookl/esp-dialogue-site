const conversationFlow = {
  loopA: [
    {
      stage: "A-1",
      text: "당신은 처음 문을 열었다. 무엇을 선택하겠는가?",
      options: [
        { label: "왼쪽 문", next: "A-2" },
        { label: "오른쪽 문", next: "A-3" }
      ]
    },
    {
      stage: "A-2",
      text: "왼쪽으로 갔다. 침묵자가 기다린다.",
      options: [
        { label: "심연을 부른다", next: "A-4" }
      ]
    },
    {
      stage: "A-3",
      text: "오른쪽으로 갔다. 루멘이 손짓한다.",
      options: [
        { label: "빛을 따라간다", next: "A-5" }
      ]
    },
    {
      stage: "A-4",
      text: "심연이 나타났다. 구조를 선택하라.",
      options: []
    },
    {
      stage: "A-5",
      text: "루멘은 윤리를 말한다. 당신은 어떻게 반응할 것인가?",
      options: []
    }
  ]
};
