import * as d3 from 'd3';
import type { CSSProperties } from 'vue';

import * as res from './utils/responsive';
import * as newick from './utils/newick';
import * as build from './build';

import * as tof from './tree-of-life';

export class ITree {
    // html part
    public readonly svgBinded: SVGSVGElement;
    public readonly styleBinded: CSSProperties | undefined;
    private _svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined>;

    // data
    private _rectRoot: d3.HierarchyNode<newick.TreeNode> | undefined;
    private _radialRoot: d3.HierarchyPointNode<newick.TreeNode> | d3.HierarchyNode<newick.TreeNode> | undefined;

    // render options
    private _height: res.NVP;
    private _width: res.NVP;

    // d3 transform initial state
    private _initTransform: d3.ZoomTransform;
    private _currTransform: d3.ZoomTransform;

    private _paddingTop: number = 0; //不要忘记定义设定这些属性的函数。
    private _paddingRight: number = 0;
    private _paddingBottom: number = 0;
    private _paddingLeft: number = 0;

    private _scaleBarSpaceHeight: number = 0;
    private _linkTextGap: number = 0; //不要忘记定义设定这些属性的函数。

    private _strokeWidth: number = 1;
    private _strokeColor: string = '#333639';

    // for rect layout
    private _rectDX: number = 0;
    private _rectDY: number = 0;
    private _rectYScale: number = 0;

    // for radial layout
    private _outerRadius: number = 0;
    private _innerRadius: number = 0;
    private _fullAngle: number = 330;
    private _startAngle: number = 0;

    private _radialYScale: number = 0;

    private _backgroundColor: string = '#fafafc';
    private _fontFamily: string = 'sans-serif';
    private _nameFontSize: number = 10;
    private _dLenFontSize: number = 10;

    private _maxNameTextWidth: number = 10;
    private _maxDataLenTextWidth: number = 10;

    private _dataLenDecimalPlaces: number = 2;

    private _isRadialLayout: boolean = false; // true is for radial, false for rect.

    private _isScalingOn: boolean = true;

    private _isScaleBarOn: boolean = true;
    private _scaleBarDataLen: number = 0.1;

    private _isDataLenOn: boolean = true;

    private _isZoomOn: boolean = false;
    private _zoom: d3.ZoomBehavior<SVGGElement, unknown> | undefined;

    // lodash throttle API
    public lodashThrottle: Function | undefined;

    constructor(
        svgBinded: SVGSVGElement,
        width: number | (() => number),
        height: number | (() => number),
        styleBinded: CSSProperties | undefined = undefined,
        backgroundColor: string | undefined = undefined,
        lodashThrottle: Function | undefined = undefined,
    ) {
        this.svgBinded = svgBinded;

        this._height = height;
        this._width = width;

        const heightValue = res.get(this._height);
        const widthValue = res.get(this._width);

        this.styleBinded = styleBinded; // 响应式图的style接口，可以不用，但是如果没有定义需求会很好用。
        if (this.styleBinded) {
            this.styleBinded.display = 'block';
            this.styleBinded.height = heightValue;
            this.styleBinded.width = widthValue;

            if (backgroundColor) { this._backgroundColor = backgroundColor; }
        }

        this.lodashThrottle = lodashThrottle;
        this._svgSelection = d3.select(this.svgBinded);

        const gBack = this._svgSelection
            .append('g')
            .attr('class', 'g-back');

        gBack
            .append('rect')
            .attr('height', heightValue)
            .attr('width', widthValue)
            .attr('fill', this._backgroundColor) // 设置背景颜色
            .attr('pointer-events', 'all') // 确保背景矩形能接收鼠标事件
            .attr('class', 'background-rect');

        const gChart = this._svgSelection
            .append('g')
            .attr('class', 'g-chart')

        gChart
            .append('g')
            .attr('class', 'g-rect-tree');

        gChart
            .append('g')
            .attr('class', 'g-radial-tree');

        gChart
            .append('g')
            .attr('class', 'g-sbar');  // scaleBar.

        this._svgSelection.append('g')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .attr('width', 0)
            .attr('height', 0)
            .attr('class', 'g-hidden'); // calculate text width.

        // about transform(zoom)
        this._initTransform = d3.zoomIdentity;
        this._currTransform = this._initTransform;
    }

    public _buildRectLayout(
        root: d3.HierarchyNode<newick.TreeNode>,
        isScalingOn: boolean,
    ) {

        if (isScalingOn) {
            build.buildTRSD(
                root,
                this._paddingTop,
                this._paddingLeft,
                this._rectDX,
                this._rectYScale,
            )

        } else {
            const widthValue = res.get(this._width)
            const rectWidthValue = widthValue -
                this._paddingLeft -
                this._paddingRight;

            let leavesY = 0;

            if ((rectWidthValue - this._linkTextGap) > this._maxNameTextWidth) {
                leavesY = widthValue - this._paddingRight - this._linkTextGap - this._maxNameTextWidth;
            } else {
                leavesY = widthValue - this._paddingRight - this._linkTextGap - (0.8 * this._paddingRight);
            }

            build.buildTRUS(
                root,
                this._paddingTop,
                leavesY,
                this._rectDX,
                this._rectDY,
            )
        }

        return this;
    }

    public renderRectLayout(isScalingOn: boolean) {
        if (this._rectRoot) {
            this._buildRectLayout(this._rectRoot, isScalingOn)

            const gRectTree = this._svgSelection.select<SVGGElement>('.g-rect-tree');
            if (!gRectTree.empty()) { gRectTree.selectAll('*').remove(); }

            // 先link后node
            gRectTree
                .selectAll('path.link') // 绘制链接线
                .data(this._rectRoot.links())
                .enter()
                .append('path')
                .attr('class', 'tree-link')
                .attr('d', (d) => {
                    return `M${d.source.y},${d.source.x}V${d.target.x}H${d.target.y}`;
                })
                .attr('fill', 'none')
                .attr('stroke', this._strokeColor)
                .attr('stroke-width', this._strokeWidth);

            const node = gRectTree
                .selectAll('g.node') // 在 SVG 中绘制节点
                .data(this._rectRoot.descendants())
                .enter()
                .append('g')
                .attr('class', 'tree-node')
                .attr('transform', function (d) {
                    return `translate(${d.y},${d.x})`;
                });

            const linkTextGap = this._linkTextGap;
            node
                .filter((d) => !d.children)
                .append('text')
                .attr('class', 'tree-text')
                .attr('dy', '.35em')
                .attr('x', function (d) {
                    return linkTextGap;
                })
                .style('text-anchor', function (d) {
                    return 'start';
                })
                .style('font-size', this._nameFontSize)
                .text(function (d) {
                    return d.data.name!;
                });
        }

        return this;
    }

    public updateRectLayout(isScalingOn: boolean) {
        if (this._rectRoot) {
            this._buildRectLayout(this._rectRoot, isScalingOn)

            const updatedDescendants = this._rectRoot.descendants();
            const updatedLinks = this._rectRoot.links();

            // 更新链接路径
            this._svgSelection.selectAll('.tree-link')
                .data(updatedLinks)
                .transition() // 加上过渡效果
                .duration(750) // 动画持续时间
                .attr('d', (d) => {
                    return `M${d.source.y},${d.source.x}V${d.target.x}H${d.target.y}`;
                });

            // 更新节点位置
            const nodes = this._svgSelection
                .selectAll('.tree-node')
                .data(updatedDescendants, (d: any) => d.data.id);

            nodes.transition() // 加上过渡效果
                .duration(750) // 动画持续时间
                .attr('transform', function (d) {
                    return `translate(${d.y},${d.x})`;
                });

            // 更新文本位置和内容
            const linkTextGap = this._linkTextGap;
            nodes.select('.tree-text')
                .transition() // 加上过渡效果
                .duration(750) // 动画持续时间
                .attr('x', function (d) {
                    return linkTextGap;
                })
                .style('text-anchor', function (d) {
                    return 'start';
                })
                .text(function (d) {
                    return d.data.name!;
                });
        }
    }

    public renderRadialLayout(isScallingOn: boolean) {
        if (this._rectRoot) {

            // building basic layout.
            this._radialRoot = this._rectRoot.copy()
                .sum(d => d.children ? 0 : 1)
                .sort((a, b) => ((a.value ?? 0) - (b.value ?? 0)) || d3.ascending(a.data.length, b.data.length));

            const radialCluster = d3.cluster<newick.TreeNode>()
                .size([this._fullAngle, this._innerRadius])
                .separation((a, b) => 1);
            this._radialRoot = radialCluster(this._radialRoot);

            tof.setRadius(
                this._radialRoot,
                this._radialRoot.data.length = 0,
                this._radialYScale
            );

            // start rendering
            const middlePoint = [(res.get(this._width) / 2), (res.get(this._height) / 2)];

            const gRadialTree = this._svgSelection
                .select<SVGGElement>('.g-radial-tree')
                .attr('transform', `translate(${middlePoint[0]}, ${middlePoint[1]})`);

            let gRadialLink = gRadialTree.select<SVGGElement>('.g-radial-link');
            if (!gRadialLink.empty()) { gRadialLink.selectAll('*').remove(); }
            else { gRadialLink = gRadialTree.append('g').attr('class', 'g-radial-link'); }

            let gRadialLinkExtent = gRadialTree.select<SVGGElement>('.g-radial-link-extent');
            if (!gRadialLinkExtent.empty()) { gRadialLinkExtent.selectAll('*').remove(); }
            else { gRadialLinkExtent = gRadialTree.append('g').attr('class', 'g-radial-link-extent'); }

            if (isScallingOn) {

                gRadialLinkExtent
                    .attr('fill', 'none')
                    .attr('stroke', this._strokeColor)
                    .attr('stroke-opacity', 0.25)
                    .selectAll('path')
                    .data(this._radialRoot.links().filter(d => !d.target.children))
                    .join('path')
                    .attr('class', 'radial-link-extent')
                    .each(function (d) { (d.target as any).linkExtensionNode = this; })
                    .attr('d', d => tof.linkExtensionVariable(d, this._innerRadius));

                gRadialLink
                    .attr('fill', 'none')
                    .attr('stroke', this._strokeColor)
                    .selectAll('path')
                    .data(this._radialRoot.links())
                    .join('path')
                    .attr('class', 'radial-link')
                    .each(function (d) { (d.target as any).linkNode = this; })
                    .attr('d', tof.linkVariable);

            } else {

                gRadialLinkExtent
                    .attr('fill', 'none')
                    .attr('stroke', this._strokeColor)
                    .attr('stroke-opacity', 0.25)
                    .selectAll('path')
                    .data(this._radialRoot.links().filter(d => !d.target.children))
                    .join('path')
                    .attr('class', 'radial-link-extent')
                    .each(function (d) { (d.target as any).linkExtensionNode = this; })
                    .attr('d', d => tof.linkExtensionConstant(d, this._innerRadius));

                gRadialLink
                    .attr('fill', 'none')
                    .attr('stroke', this._strokeColor)
                    .selectAll('path')
                    .data(this._radialRoot.links())
                    .join('path')
                    .attr('class', 'radial-link')
                    .each(function (d) { (d.target as any).linkNode = this; })
                    .attr('d', tof.linkConstant);

            }

            gRadialTree.append("g")
                .selectAll("text")
                .data(this._radialRoot.leaves())
                .join("text")
                .attr("dy", ".31em")
                .attr("transform", d => `rotate(${d.x! - 90}) translate(${this._innerRadius + this._linkTextGap},0)${d.x! < 180 ? "" : " rotate(180)"}`)
                .attr("text-anchor", d => d.x! < 180 ? "start" : "end")
                .style('font-size', this._nameFontSize)
                .text(function (d) {
                    return d.data.name!;
                });

        }
    }

    public updateRadialLayout(isScalingOn: boolean) {
        const gRadialTree = this._svgSelection
            .select<SVGGElement>('.g-radial-tree');

        const radialLink = gRadialTree.selectAll('.radial-link');
        const radialLinkExtent = gRadialTree.selectAll('.radial-link-extent');

        radialLinkExtent
            .transition()
            .duration(750)
            .attr('d', isScalingOn ?
                (d => tof.linkExtensionVariable(d, this._innerRadius)) :
                (d => tof.linkExtensionConstant(d, this._innerRadius)));

        radialLink
            .transition()
            .duration(750)
            .attr("d", isScalingOn ?
                tof.linkVariable :
                tof.linkConstant);
    }

    public renderScaleBar(
        isRadialLayout: boolean,
    ) {
        let actualBarWidth = 0;
        let deviation = [0, 0];

        const heightValue = res.get(this._height);
        const widthValue = res.get(this._width);

        if (!isRadialLayout) {
            actualBarWidth = this._scaleBarDataLen * this._rectYScale;

        } else {
            actualBarWidth = this._scaleBarDataLen * this._radialYScale;

            if ((widthValue + this._paddingRight + this._paddingLeft) >= (heightValue + this._paddingBottom + this._paddingTop)) {
                deviation[0] = (widthValue / 2) - this._outerRadius - this._paddingLeft;
            } else {
                deviation[1] = (heightValue / 2) - this._outerRadius - this._paddingBottom;
            }
        }

        const scaleMarkHeight = 2;

        const gSbar = this._svgSelection.select<SVGGElement>('.g-sbar');
        gSbar.attr('transform', `translate(${this._paddingLeft + deviation[0]}, ${heightValue - this._paddingBottom - scaleMarkHeight + deviation[1]})`);

        gSbar.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', actualBarWidth)
            .attr('y2', 0)
            .attr('stroke', this._strokeColor)
            .attr('stroke-width', this._strokeWidth)
            .attr('class', 'scaleBar');

        gSbar.append('line')
            .attr('x1', 0)
            .attr('y1', scaleMarkHeight)
            .attr('x2', 0)
            .attr('y2', -scaleMarkHeight)
            .attr('stroke', this._strokeColor)
            .attr('stroke-width', this._strokeWidth)
            .attr('class', 'scaleBarLeft');

        gSbar.append('line')
            .attr('x1', actualBarWidth)
            .attr('y1', scaleMarkHeight)
            .attr('x2', actualBarWidth)
            .attr('y2', -scaleMarkHeight)
            .attr('stroke', this._strokeColor)
            .attr('stroke-width', this._strokeWidth)
            .attr('class', 'scaleBarRight');

        gSbar.append('text')
            .attr('x', actualBarWidth / 2)
            .attr('y', 0)
            .attr('dy', '-0.35em')  // 向上移动一点，防止文本覆盖线条
            .attr('text-anchor', 'middle')  // 文本水平居中
            .attr('font-family', this._fontFamily)
            .attr('font-size', this._dLenFontSize)
            .attr('class', 'scaleBarText')
            .text(this._scaleBarDataLen);

        return this;
    }

    public renderDataLen() {
        const node = this._svgSelection
            .selectAll<SVGGElement, d3.HierarchyNode<newick.TreeNode>>('.tree-node');

        const maxDataLenTextWidth = this._maxDataLenTextWidth;
        const yScale = this._rectYScale;
        const decimalPlaces = this._dataLenDecimalPlaces;

        node
            .append('text')
            .attr('class', 'data-len')
            .attr('dy', '-0.35em')
            .attr('x', function (d) {
                if (d.data.length && (d.data.length * yScale >= maxDataLenTextWidth)) {
                    return -0.5 * (d.data.length * yScale);
                } else {
                    return '-0.35em';
                }
            })
            .style('text-anchor', function (d) {
                if (d.data.length && (d.data.length * yScale >= maxDataLenTextWidth)) {
                    return 'middle';
                } else {
                    return 'end';
                }
            })
            .style('font-size', this._dLenFontSize)
            .text(function (d) {
                if (d.data.length) {
                    const factor = Math.pow(10, decimalPlaces);
                    return Math.round(d.data.length * factor) / factor;
                } else {
                    return d.data.length !== undefined ? d.data.length.toString() : '';
                }
            });

        return this;
    }

    public zoomOn() {
        this._zoom = d3.zoom<SVGGElement, unknown>()
            .scaleExtent([0.5, 5]) // 设置缩放比例的最小值和最大值
            .translateExtent([
                [-res.get(this._width), -res.get(this._height)], // 最小可移动点
                [2 * res.get(this._width), 2 * res.get(this._height)] // 最大可移动点
            ]) // 设置允许的平移范围
            .on('zoom', (event) => {
                this._currTransform = event.transform;

                // 更新变换
                this._svgSelection
                    .select<SVGGElement>('.g-chart')
                    .attr('transform', this._currTransform.toString());
            })

        const gBack = this._svgSelection.select<SVGGElement>('.g-back');
        gBack.call(this._zoom);
        this._isZoomOn = true;
    }

    public zoomOff() {
        this._svgSelection
            .select<SVGGElement>('.g-back')
            .on('.zoom', null);

        this._isZoomOn = false;
    }

    private _load(
        data: string | undefined = undefined, // when load === undefined, this act as reload.
    ) {
        const heightValue = res.get(this._height);
        const widthValue = res.get(this._width);

        if (data !== undefined) {
            this._rectRoot = d3.hierarchy<newick.TreeNode>(newick.parseNewick(data));
        }

        if (this._rectRoot !== undefined) {
            const loadResult = build.loadFromRoot(this._rectRoot);

            const maxDataLen = loadResult.maxDataLen;
            const maxNameTextLen = loadResult.maxNameTextLen;
            const rootLeaves = loadResult.rootLeaves;
            const rootHeight = loadResult.rootHeight;

            const spacePaddingScale = 1;
            const gapPaddingScale = 0.2; // 这两个是为了保证这些gap是长宽的百分比，自适应。

            this._paddingTop = this._paddingBottom = Math.round(res.paddingVerticalCurve(rootLeaves) * heightValue);
            this._paddingLeft = this._paddingRight = Math.round(res.paddingHorizontalCurve(rootHeight) * widthValue);
            this._scaleBarSpaceHeight = Math.round(spacePaddingScale * this._paddingBottom);
            this._linkTextGap = Math.round(gapPaddingScale * this._paddingRight);

            const rectHeightValue = heightValue -
                this._paddingTop -
                this._paddingBottom -
                this._scaleBarSpaceHeight;

            const rectWidthValue = widthValue -
                this._paddingLeft -
                this._paddingRight;

            this._rectDX = rectHeightValue / (rootLeaves - 1);
            this._nameFontSize = res.rectNameFontSizeLookup(this._rectDX);
            this._dLenFontSize = res.rectDLenFontSizeLookup(this._rectDX);

            // 以下d3代码的意义在于创建一个隐形的部件来计算文本占据的最大空间，这其实是一个比较
            // 不优雅的解决方案，但是考虑到如果有更换字体的需求，这样的响应会更智能一点。

            const tempText = this._svgSelection
                .select<SVGGElement>('.g-hidden')
                .append('text')
                .attr('font-family', this._fontFamily)
                .style('visibility', 'hidden');
            const str = 'a';

            this._maxNameTextWidth = tempText
                .attr('font-size', this._nameFontSize)
                .text(str.repeat(maxNameTextLen))
                .node()!
                .getBBox()
                .width;
            this._maxDataLenTextWidth = tempText
                .attr('font-size', this._dLenFontSize)
                .text('a.' + str.repeat(this._dataLenDecimalPlaces))
                .node()!
                .getBBox()
                .width;

            if ((rectWidthValue - this._linkTextGap) > this._maxNameTextWidth) {
                this._rectDY = (rectWidthValue - this._linkTextGap - this._maxNameTextWidth) / rootHeight;
                this._rectYScale = (rectWidthValue - this._linkTextGap - this._maxNameTextWidth) / maxDataLen;
            } else {
                this._rectDY = (rectWidthValue - this._linkTextGap - Math.round(0.8 * this._paddingRight)) /
                    rootHeight;
                this._rectYScale = (rectWidthValue - this._linkTextGap - Math.round(0.8 * this._paddingRight)) /
                    maxDataLen;
            }

            this._outerRadius = tof.getOuterRadius(
                widthValue,
                heightValue,
                this._paddingTop,
                this._paddingRight,
                this._paddingBottom,
                this._paddingLeft
            )
            if ((this._outerRadius - this._linkTextGap) > this._maxNameTextWidth) {
                this._innerRadius = this._outerRadius - this._linkTextGap - this._maxNameTextWidth;
            } else {
                this._innerRadius = this._outerRadius -
                    this._linkTextGap -
                    Math.round(0.8 * this._paddingRight);
            }
            this._radialYScale = this._innerRadius / maxDataLen;
        }
    }

    public load(
        data: string | undefined = undefined, // when load === undefined, this act as reload.
        isRadialLayout: boolean = false,
        isScalingOn: boolean = true,
        isScaleBarOn: boolean = true,
        isDataLenOn: boolean = true,
        isZoomOn: boolean = true,
    ) {
        this._load(data);

        this._isScalingOn = isScalingOn;
        this._isScaleBarOn = isScaleBarOn;
        this._isDataLenOn = isDataLenOn;
        this._isZoomOn = isZoomOn;

        if (!isRadialLayout) {
            this._isRadialLayout = false;

            this.renderRectLayout(isScalingOn);

            if (isScaleBarOn) { this.renderScaleBar(false); }
            if (isDataLenOn) { this.renderDataLen(); }

        } else { // radial layout
            this._isRadialLayout = true;

            this
                .renderRadialLayout(isScalingOn);

            if (isScaleBarOn) { this.renderScaleBar(true); }
        };

        if (isZoomOn) { this.zoomOn(); }

        return this;
    }

    public reload() {
        this._load();

        return this;
    }

    public removeAll() {
        d3.select(this.svgBinded).selectAll('*').remove();

        return this;
    }

    public removeRectTree() {
        this._svgSelection
            .select<SVGGElement>('.g-rect-tree')
            .selectAll('*')
            .remove();

        return this;
    }

    public removeRadialTree() {
        this._svgSelection
            .select<SVGGElement>('.g-radial-tree')
            .selectAll('*')
            .remove();

        return this;
    }

    public removeScaleBar() {
        this._svgSelection.select<SVGGElement>('.g-sbar').selectAll('*').remove();
        return this;
    }


    public removeDataLen() {
        this._svgSelection
            .selectAll<SVGTextElement, d3.HierarchyNode<newick.TreeNode>>('.data-len')
            .remove();
    }

    private _svgResizeRerender() {
        const heightValue = res.get(this._height);
        const widthValue = res.get(this._width);

        this._svgSelection
            .select('.background-rect')
            .attr('height', heightValue)
            .attr('width', widthValue);

        if (this.styleBinded) {
            this.styleBinded.height = heightValue;
            this.styleBinded.width = widthValue;
        }

        return this;
    }

    public resizeUpdate(
        wait: number | undefined = undefined
    ) {
        if (this.lodashThrottle) {
            const throttleSvgResizeRerender = this.lodashThrottle(
                (event: Event) => { this._svgResizeRerender(); },
                wait
            );
            throttleSvgResizeRerender();
        } else { this._svgResizeRerender(); }

        return this;
    }

    public resizeListener(
        wait: number | undefined = undefined
    ): EventListener {

        if (this.lodashThrottle) {
            return this.lodashThrottle(
                (event: Event) => { this._svgResizeRerender(); },
                wait
            );
        } else { return (event: Event) => { this._svgResizeRerender(); } }
    }

    public resetLayout() {
        this.reload();
        if (!this._isRadialLayout) {
            this
                .removeRectTree()
                .renderRectLayout(this._isScalingOn);

            if (this._isScalingOn && this._isDataLenOn) {
                this.renderDataLen();
            } else { this.removeDataLen(); }

        } else { // radial layout
            this
                .removeRadialTree()
                .renderRadialLayout(this._isScalingOn);
        }

        this.removeScaleBar();
        if (this._isScalingOn && this._isScaleBarOn) {
            this.renderScaleBar(this._isRadialLayout);
        } else { this.removeScaleBar(); }
    }

    public resetZoom() {
        this._currTransform = d3.zoomIdentity; // 重置变换

        // 重新应用 zoom 行为
        if (this._zoom) {
            const gBack = this._svgSelection.select<SVGGElement>('.g-back');

            gBack
                .transition() // 加上过渡效果
                .duration(750) // 动画持续时间
                .call(this._zoom.transform, this._currTransform); // 应用 zoom 行为并重置

            gBack.on('end', () => {
                this._zoom?.transform(gBack, this._currTransform);
            });
        }
    }

    public switchScalling(
        isScalingOn: boolean,
    ) {
        if (!this._isRadialLayout) {
            if ((isScalingOn && !this._isScalingOn) || (!isScalingOn && this._isScalingOn)) {
                this.updateRectLayout(isScalingOn); // update layout;
                this._isScalingOn = isScalingOn;
            }

            if (isScalingOn && this._isScaleBarOn) {
                this.renderScaleBar(false);

            } else { this.removeScaleBar(); }

            if (isScalingOn && this._isDataLenOn) {
                this.renderDataLen();

            } else { this.removeDataLen(); }

        } else { // radial layout;
            if ((isScalingOn && !this._isScalingOn) || (!isScalingOn && this._isScalingOn)) {
                this.updateRadialLayout(isScalingOn);

                this._isScalingOn = isScalingOn;
            }

            if (isScalingOn && this._isScaleBarOn) {
                this.renderScaleBar(true);

            } else { this.removeScaleBar(); }
        }
    }

    public switchLayout(
        isRadialLayout: boolean,
    ) {
        if (!this._isRadialLayout && isRadialLayout) {
            this
                .removeRectTree()
                .renderRadialLayout(this._isScalingOn);

            this._isRadialLayout = true;

            this.removeScaleBar();
            if (this._isScalingOn && this._isScaleBarOn) {
                this.renderScaleBar(true);
            } else { this.removeScaleBar(); }

        } else if (this._isRadialLayout && !isRadialLayout) {
            this
                .removeRadialTree()
                .renderRectLayout(this._isScalingOn);

            this._isRadialLayout = false;

            this.removeScaleBar();
            if (this._isScalingOn && this._isScaleBarOn) {
                this.renderScaleBar(false);
            } else { this.removeScaleBar(); }

            if (this._isScalingOn && this._isDataLenOn) {
                this.renderDataLen();
            } else { this.removeDataLen(); }
        }
    }

    public switchScaleBarState(
        render: boolean
    ) {
        if (render && !this._isScaleBarOn) {
            this._isScaleBarOn = true;
            if (this._isScalingOn) {
                this.renderScaleBar(this._isRadialLayout);
            }

        } else if (!render && this._isScaleBarOn) {
            this._isScaleBarOn = false;
            this.removeScaleBar();
        }
    }
}