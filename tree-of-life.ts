// from Mike Bostock's 'Tree of Life' d3 demo: "https://observablehq.com/@d3/tree-of-life".

import * as newick from "./utils/newick";

export function setRadius(
    d: d3.HierarchyNode<newick.TreeNode> | d3.HierarchyPointNode<newick.TreeNode>,
    y0: number,
    k: number
) {
    if (typeof d.data.length === 'number') {
        (d as any).radius = (y0 += d.data.length) * k;
    }
    if (d.children) d.children.forEach(d => setRadius(d, y0, k));
}

function linkStep(
    startAngle: number,
    startRadius: number,
    endAngle: number,
    endRadius: number,
): string {
    const c0 = Math.cos(startAngle = (startAngle - 90) / 180 * Math.PI);
    const s0 = Math.sin(startAngle);
    const c1 = Math.cos(endAngle = (endAngle - 90) / 180 * Math.PI);
    const s1 = Math.sin(endAngle);
    return "M" + startRadius * c0 + "," + startRadius * s0
        + (endAngle === startAngle ? "" : "A" + startRadius + "," + startRadius + " 0 0 " + (endAngle > startAngle ? 1 : 0) + " " + startRadius * c1 + "," + startRadius * s1)
        + "L" + endRadius * c1 + "," + endRadius * s1;
}

export function linkVariable(d: any): string {
    return linkStep(d.source.x, d.source.radius, d.target.x, d.target.radius);
}

export function linkConstant(d: any): string {
    return linkStep(d.source.x, d.source.y, d.target.x, d.target.y);
}

export function linkExtensionVariable(
    d: any,
    innerRadius: number,
): string {
    return linkStep(d.target.x, d.target.radius, d.target.x, innerRadius);
}

export function linkExtensionConstant(
    d: any,
    innerRadius: number,
): string {
    return linkStep(d.target.x, d.target.y, d.target.x, innerRadius);
}

// below this is my code (@Litai Yi).
export function getOuterRadius(
    width: number,
    height: number,
    paddingTop: number,
    paddingRight: number,
    paddingBottom: number, // in practice this actually is: paddingBottom + initial Scale Bar Space Height.
    paddingLeft: number,
): number {
    if ((width + paddingLeft + paddingRight) <= (height + paddingTop + paddingBottom)) {
        return (paddingLeft > paddingRight) ? (width / 2 - paddingLeft) : (width / 2 - paddingRight);
    } else {
        return (paddingTop > paddingBottom) ? (height / 2 - paddingTop) : (height / 2 - paddingBottom);
    }
}