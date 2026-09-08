import { Search, X } from "lucide-react-native";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Keyboard, TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { themeColors } from "@/lib/theme";

interface PantrySearchInputProps {
  onChangeText: (value: string) => void;
  onClear: () => void;
}

export interface PantrySearchInputRef {
  clear: () => void;
}

export const PantrySearchInput = forwardRef<
  PantrySearchInputRef,
  PantrySearchInputProps
>(function PantrySearchInput(
  { onChangeText, onClear }: PantrySearchInputProps,
  ref,
) {
  const inputRef = useRef<TextInput>(null);
  const [hasText, setHasText] = useState(false);
  const clear = useCallback(() => {
    Keyboard.dismiss();
    inputRef.current?.clear();
    setHasText(false);
    onChangeText("");
    onClear();
  }, [onChangeText, onClear]);
  useImperativeHandle(ref, () => ({ clear }), [clear]);
  return (
    <Input
      ref={inputRef}
      label="Search your pantry"
      placeholder="Find a product or shelf"
      // Native text/selection must not be overwritten by a delayed list render.
      // Explicit clears use the native ref; ordinary typing never writes back.
      defaultValue=""
      onChangeText={(text) => {
        setHasText(text.length > 0);
        onChangeText(text);
      }}
      autoCorrect={false}
      clearButtonMode="never"
      className="pr-0"
      leadingAccessory={
        <Search
          size={20}
          color={themeColors.secondaryInk}
          style={{ marginLeft: 16 }}
        />
      }
      trailingAccessory={
        // Keep the text width stable when the clear control appears/disappears.
        <View className="mr-1 h-12 w-12 items-center justify-center">
          {hasText && (
            <Button
              variant="ghost"
              iconOnly
              forceSolid
              accessibilityLabel="Clear pantry search"
              onPress={clear}
            >
              <X size={18} color={themeColors.secondaryInk} />
            </Button>
          )}
        </View>
      }
    />
  );
});
