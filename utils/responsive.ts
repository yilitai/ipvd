export type NumericValueProvider = number | (() => number);
export type NVP = NumericValueProvider;

export function get(nvp: NVP): number {
    return typeof nvp === 'function' ? (nvp as () => number)() : nvp;
}

// lookups
export function paddingHorizontalCurve(rootHeight: number): number {
    // 调整参数来控制函数行为
    const A = 0.05;  // 控制最大幅度
    const B = 0.02;  // 增大这个值，使较大rootHeight时的输出更小
    const C = 0.005; // 确保较大rootHeight时paddingHorizontalTimes趋向一个较小的值

    // 使用 atan 函数生成曲线，确保 rootHeight 始终为正数
    const paddingHorizontalTimes = A * Math.atan(1 / (B * rootHeight)) + C;

    console.log("Calculated paddingHorizontalTimes:", paddingHorizontalTimes);

    return paddingHorizontalTimes;
}

export function paddingVerticalCurve(rootLeaves: number): number {
    // 调整参数来控制函数行为
    const A = 0.05;  // 控制最大幅度
    const B = 0.02; // 增大这个值，使较大rootLeaves时的输出更小
    const C = 0.005; // 确保较大rootLeaves时paddingVerticalTimes趋向一个较小的值

    // 使用 atan 函数生成曲线，确保 rootLeaves 始终为正数
    const paddingVerticalTimes = A * Math.atan(1 / (B * rootLeaves)) + C;

    console.log("Calculated paddingVerticalTimes:", paddingVerticalTimes);

    return paddingVerticalTimes;
}


// just set the scalebar space to the percentage of paddingBottom.
// just set the linkTextGap to the percentage of paddingRight.

export function rectNameFontSizeLookup(xStep: number): number {
    console.log("xStep: " + String(xStep))
    if (xStep <= 6) { return Math.round(xStep); }
    else {
        return 10;
    }
}

export function rectDLenFontSizeLookup(xStep: number): number {
    console.log("xStep: " + String(xStep))
    if (xStep <= 6) { return Math.round(xStep) - 1; }
    else {
        return 10;
    }
}