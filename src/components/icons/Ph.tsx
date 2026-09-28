// Phosphor icon set used by the storefront (design handoff: Light weight,
// Fill only for the saved-heart state, 16-21px). Imported per icon from the
// SSR build so they render in Server Components too and only the icons
// listed here reach the bundle — the package isn't in Next's default
// optimizePackageImports list.
import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react/dist/lib/types";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowUUpLeft } from "@phosphor-icons/react/dist/ssr/ArrowUUpLeft";
import { ArrowsOutSimple } from "@phosphor-icons/react/dist/ssr/ArrowsOutSimple";
import { CaretDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { Check } from "@phosphor-icons/react/dist/ssr/Check";
import { Heart } from "@phosphor-icons/react/dist/ssr/Heart";
import { LockSimple } from "@phosphor-icons/react/dist/ssr/LockSimple";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { Minus } from "@phosphor-icons/react/dist/ssr/Minus";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { SlidersHorizontal } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { Truck } from "@phosphor-icons/react/dist/ssr/Truck";
import { X } from "@phosphor-icons/react/dist/ssr/X";

export type { IconProps };

function light(Icon: ComponentType<IconProps>, defaultSize = 18) {
  function LightIcon({ size = defaultSize, weight = "light", ...props }: IconProps) {
    return <Icon size={size} weight={weight} aria-hidden {...props} />;
  }
  return LightIcon;
}

export const ArrowLeftIcon = light(ArrowLeft);
export const ArrowRightIcon = light(ArrowRight);
export const ArrowUUpLeftIcon = light(ArrowUUpLeft);
export const ArrowsOutSimpleIcon = light(ArrowsOutSimple);
export const CaretDownIcon = light(CaretDown, 14);
export const CaretLeftIcon = light(CaretLeft, 11);
export const CaretRightIcon = light(CaretRight, 11);
export const CheckIcon = light(Check);
export const HeartPhIcon = light(Heart, 20);
export const LockSimpleIcon = light(LockSimple);
export const MagnifyingGlassIcon = light(MagnifyingGlass);
export const MinusIcon = light(Minus, 16);
export const PlusIcon = light(Plus, 16);
export const SlidersHorizontalIcon = light(SlidersHorizontal);
export const TruckIcon = light(Truck);
export const XIcon = light(X);
