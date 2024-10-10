import type { TreeNode } from "./utils/newick";
import type { HierarchyNode } from "d3";

export function loadFromRoot(
    hierarchyRoot: HierarchyNode<TreeNode>
): {
    maxDataLen: number,
    maxNameTextLen: number,

    rootLeaves: number,
    rootHeight: number
} {
    let maxDataLen = 0; // 初始化最大分支长度。
    let maxNameTextLen = 0;   // 初始化最大名字长度。
    let rootLeaves = 0;    // 初始化叶子数量。
    let rootHeight = 0;    // 初始化根节点高度。

    function preOrderTraversalLoad(
        node: HierarchyNode<TreeNode>,
        branchLen: number, // 因为branchLen是整条分支的属性，所以递归要传递，名字不需要，下同。
        nodeDepth: number
    ) {
        if (node.data.length) {
            if ((branchLen + node.data.length) > maxDataLen) { maxDataLen = (branchLen + node.data.length); }
        }

        if (node.data.name) {
            if (node.data.name.length > maxNameTextLen) { maxNameTextLen = node.data.name.length; }
        }

        if (nodeDepth > rootHeight) { rootHeight = nodeDepth; }

        if (node.children) { // 遍历子节点，先序遍历。
            node.children.forEach((child) => {
                if (node.data.length) { preOrderTraversalLoad(child, branchLen + node.data.length, nodeDepth + 1); }
                else { preOrderTraversalLoad(child, branchLen, nodeDepth + 1); }
            });
        } else { rootLeaves += 1; }
    }

    preOrderTraversalLoad(hierarchyRoot, 0, 0);
    return {
        maxDataLen: maxDataLen,
        maxNameTextLen: maxNameTextLen,

        rootLeaves: rootLeaves,
        rootHeight: rootHeight
    }
}

export function buildTRSD(
    root: d3.HierarchyNode<TreeNode>,

    firstLeafX: number,
    rootY: number,

    xStep: number,
    yScale: number,
): void {
    let currentX = firstLeafX;

    function postOrderTraversal2(
        node: d3.HierarchyNode<TreeNode>,
        xStep: number,
    ) {

        if (node.children) {
            let childXList: number[] = [];

            node.children.forEach((child) => { childXList.push(postOrderTraversal2(child, xStep)); });
            node.x = (Math.min(...childXList) + Math.max(...childXList)) / 2;

        } else {
            node.x = currentX;
            currentX += xStep;
        }

        return node.x;
    }

    function preOrderTraversal1(
        node: d3.HierarchyNode<TreeNode>,
        parentY: number,
        yScale: number
    ) { // 深度优先遍历并计算每个节点的横坐标。
        if (node.data.length) {
            node.y = parentY + (node.data.length * yScale);
        }
        else { node.y = parentY }

        if (node.children) {
            node.children.forEach((child) => { preOrderTraversal1(child, node.y!, yScale); });
        }
    }

    postOrderTraversal2(
        root,
        xStep,
    );

    preOrderTraversal1(
        root,
        rootY,
        yScale
    )
}

export function buildTRUS(
    root: d3.HierarchyNode<TreeNode>,

    firstLeafX: number,
    leavesY: number,

    xStep: number,
    yStep: number,
): void {
    let currentX = firstLeafX;

    function postOrderTraversal1(
        node: d3.HierarchyNode<TreeNode>,
        xStep: number,
        yStep: number
    ) {

        if (node.children) {
            let childXList: number[] = [];
            let childYList: number[] = [];

            node.children.forEach((child) => {
                const { x, y } = postOrderTraversal1(child, xStep, yStep);
                childXList.push(x);
                childYList.push(y);
            });

            node.x = (Math.min(...childXList) + Math.max(...childXList)) / 2;
            node.y = Math.min(...childYList) - yStep;

        } else {
            node.x = currentX;
            currentX += xStep;

            node.y = leavesY;
        }

        return { "x": node.x, "y": node.y };
    }

    postOrderTraversal1(root, xStep, yStep);
}