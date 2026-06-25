export const getBackgroundColor = (index: number) => {
  const colors = [
    "#ffc5a7",
    "#cff5f1",
    "#82d6e8",
    "#beb0dd",
    "#ffe07d",
    "#d3cfff",
    "#e2afcf",
    "#f3eed9",
    "#edc2e0",
    "#86e5ff",
  ];
  return colors[index % colors.length];
};

interface ColoresUI {
  [key: string]: string;
}

export const coloresui: ColoresUI[] = [
  {
    Tareas: "#c5e1a4",
    Metas: "#b45dc3",
    Premios: "#3fccde",
    Monitor: "#ff9fc0",
    Settings: "#fbf39b",
  },
];
