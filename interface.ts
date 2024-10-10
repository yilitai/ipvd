import type { TreeNode } from "./utils/newick";

export interface DyloTreeInterface {
    svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined>;

    root: d3.HierarchyNode<TreeNode> | undefined;
    rootDescendants: d3.HierarchyNode<TreeNode>[] | undefined;
    rootLinks: Array<d3.HierarchyLink<TreeNode>> | undefined;

    linkTextGap: number;
}