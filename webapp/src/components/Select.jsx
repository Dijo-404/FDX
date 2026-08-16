import * as SelectPrimitive from "@radix-ui/react-select";
import Icon from "./Icon";
import "./Select.css";

const EMPTY_VALUE = "__fdx_empty_value__";

export default function Select({
  value,
  onValueChange,
  options,
  disabled = false,
  ariaLabel,
  className = "",
}) {
  const encodedValue = value === "" ? EMPTY_VALUE : value;

  return (
    <SelectPrimitive.Root
      value={encodedValue}
      onValueChange={(nextValue) =>
        onValueChange?.(nextValue === EMPTY_VALUE ? "" : nextValue)
      }
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={`clean-select-trigger ${className}`.trim()}
        aria-label={ariaLabel}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="clean-select-chevron">
          <Icon name="chevron" size={16} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="clean-select-content"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <SelectPrimitive.Viewport className="clean-select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="clean-select-item"
                key={option.value || EMPTY_VALUE}
                value={option.value || EMPTY_VALUE}
                disabled={option.disabled}
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="clean-select-check">
                  <Icon name="check" size={15} strokeWidth={2.2} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
