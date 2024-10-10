export type TreeNode = {
    id: number;
    name?: string;
    length?: number;
    children?: TreeNode[];
}

// https://github.com/jasondavies/newick.js -- chatgpt translated ts version.
// [I added the id to locate each node, and also I changed branchset to children for better compatibility. ]
export function parseNewick(a: string): TreeNode {
    const e: TreeNode[] = [];
    let r: TreeNode = { id: 0 };
    let idTotal: number = 1;

    const s = a.split(/\s*(;|\(|\)|,|:)\s*/);

    for (let t = 0; t < s.length; t++) {
        const n = s[t];
        switch (n) {
            case "(":
                const c: TreeNode = { id: idTotal };
                idTotal += 1;

                r.children = [c];
                e.push(r);
                r = c;
                break;
            case ",":
                const c2: TreeNode = { id: idTotal };
                idTotal += 1;

                e[e.length - 1].children!.push(c2);
                r = c2;
                break;
            case ")":
                r = e.pop()!;
                break;
            case ":":
                break;
            default:
                const h = s[t - 1];
                if (h === ")" || h === "(" || h === ",") {
                    r.name = n;
                } else if (h === ":") {
                    r.length = parseFloat(n);
                }
                break;
        }
    }

    return r;
}