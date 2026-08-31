declare module "react-test-renderer" {
  import type { ReactElement } from "react";

  export interface ReactTestInstance {
    props: Record<string, unknown>;
    findByProps(props: Record<string, unknown>): ReactTestInstance;
  }

  export interface ReactTestRenderer {
    root: ReactTestInstance;
  }

  export function act(callback: () => void | Promise<void>): void | Promise<void>;

  const TestRenderer: {
    create(element: ReactElement): ReactTestRenderer;
  };

  export default TestRenderer;
}
