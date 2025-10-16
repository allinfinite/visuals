declare module 'alea' {
  interface AleaGenerator {
    (): number;
  }

  function Alea(seed?: string | number): AleaGenerator;

  export = Alea;
}

