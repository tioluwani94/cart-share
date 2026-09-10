import React from "react";
import TestRenderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { Keyboard, TextInput } from "react-native";

import { CodeInput } from "./CodeInput";

describe("CodeInput", () => {
  it.each([0, 3])(
    "accepts a full pasted invite code from cell %s without native truncation",
    (index) => {
      const onChange = jest.fn();
      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = TestRenderer.create(
          <CodeInput value="AB" onChange={onChange} />,
        );
      });
      const inputs = renderer.root.findAllByProps({
        textContentType: "oneTimeCode",
      });
      expect(inputs[index].props.maxLength).toBeUndefined();
      act(() =>
        (inputs[index].props.onChangeText as (text: string) => void)(
          " cd-12 ef ",
        ),
      );
      expect(onChange).toHaveBeenLastCalledWith("CD12EF");
      act(() => renderer.unmount());
    },
  );

  it("gives every invite-code cell a working Done escape", () => {
    const dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation();
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <CodeInput value="" onChange={jest.fn()} />,
      );
    });

    const inputs = (
      renderer.root as ReactTestInstance & {
        findAllByType: (type: typeof TextInput) => ReactTestInstance[];
      }
    ).findAllByType(TextInput);
    expect(inputs).toHaveLength(6);
    for (const input of inputs) {
      expect(input.props.returnKeyType).toBe("done");
      expect(input.props.submitBehavior).toBe("blurAndSubmit");
    }

    act(() => (inputs[0].props.onSubmitEditing as () => void)());
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
