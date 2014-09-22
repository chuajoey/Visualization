(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(["d3/d3", "../common/SVGWidget", "../common/Surface", "../chart/MultiChartSurface", "../common/Palette", "../graph/Graph", "../graph/Vertex", "../graph/Edge", "./HipieDDL"], factory);
    } else {
        root.Graph = factory(root.d3, root.SVGWidget, root.Surface, root.MultiChartSurface, root.Palette, root.GraphWidget, root.Vertex, root.Edge, root.HipieDDL);
    }
}(this, function (d3, SVGWidget, Surface, MultiChartSurface, Palette, GraphWidget, Vertex, Edge, HipieDDL) {
    function Graph(target) {
        GraphWidget.call(this);

        this.marshaller = new HipieDDL.Marshaller();
        this._visualizeRoxie = false;
        this._url = "";
    };
    Graph.prototype = Object.create(GraphWidget.prototype);

    Graph.prototype.url = function (_) {
        if (!arguments.length) return this._url;
        this._url = _;
        return this;
    };

    Graph.prototype.visualizeRoxie = function (_) {
        if (!arguments.length) return this._visualizeRoxie;
        this._visualizeRoxie = _;
        return this;
    };

    Graph.prototype.render = function () {
        this.data({ vertices: [], edges: []});
        GraphWidget.prototype.render.call(this);

        var context = this;
        this.marshaller.url(this._url, function (response) {
            context.doRender();
            for (var key in context.marshaller.dashboards) {
                var dashboard = context.marshaller.dashboards[key];
                for (var key in dashboard.datasources) {
                    dashboard.datasources[key].processResponse(response);
                }
            }
        });
        return this;
    };

    Graph.prototype.doRender = function () {
        var context = this;
        var vertices = [];
        var vertexMap = {};
        this.marshaller.accept({
            _visualizeRoxie: context._visualizeRoxie,
            visit: function (item) {
                if (item instanceof HipieDDL.DataSource) {
                    if (this._visualizeRoxie) {
                        var params = "";
                        item.filter.forEach(function (item) {
                            if (params.length > 0) {
                                params += ", ";
                            }
                            params += item;
                        });
                        params = "(" + params + ")";
                        vertexMap[item.id] = new Vertex()
                            .class("vertexLabel")
                            .faChar("\uf1c0")
                            .text(item.id + params)
                        ;
                        vertices.push(vertexMap[item.id]);
                    }
                } else if (item instanceof HipieDDL.Output) {
                    if (this._visualizeRoxie) {
                        vertexMap[item.dataSource.id + "." + item.id] = new Vertex()
                            .class("vertexLabel")
                            .faChar("\uf0ce")
                            .text(item.id)
                        ;
                        vertices.push(vertexMap[item.dataSource.id + "." + item.id]);
                    }
                } else if (item instanceof HipieDDL.Visualization) {
                    if (item.widget) {
                        var width = 210;
                        var newSurface = null;
                        if (item.widget instanceof Surface) {
                            newSurface = item.widget
                                .size({ width: width, height: 210 })
                            ;
                        } else {
                            width = 280;
                            newSurface = new Surface()
                                .size({ width: width, height: 210 })
                                .title(item.id)
                                .content(item.widget)
                            ;
                        }
                        if (newSurface) {
                            vertexMap[item.id] = newSurface;
                            vertices.push(newSurface);

                            if (item.type === "CHORO") {
                                newSurface._menu
                                    .data(Palette.brewer())
                                ;
                                var context = this;
                                newSurface._menu.click = function (d) {
                                    newSurface._content
                                        .palette(d)
                                        .render(d)
                                    ;
                                }
                            }
                        }
                    }
                }
            }
        });

        var edges = [];
        this.marshaller.accept({
            _visualizeRoxie: context._visualizeRoxie,
            visit: function (item) {
                if (item instanceof HipieDDL.DataSource) {
                } else if (item instanceof HipieDDL.Output) {
                    if (this._visualizeRoxie) {
                        if (vertexMap[item.dataSource.id] && vertexMap[item.dataSource.id + "." + item.id]) {
                            edges.push(new Edge()
                                .sourceVertex(vertexMap[item.dataSource.id])
                                .targetVertex(vertexMap[item.dataSource.id + "." + item.id])
                            );
                        }
                    }
                } else if (item instanceof HipieDDL.Visualization) {
                    if (this._visualizeRoxie) {
                        if (HipieDDL.exists("source.id", item)) {
                            if (vertexMap[item.source.id + "." + item.source.output] && vertexMap[item.id]) {
                                edges.push(new Edge()
                                    .sourceVertex(vertexMap[item.source.id + "." + item.source.output])
                                    .targetVertex(vertexMap[item.id])
                                    .sourceMarker("circleFoot")
                                    .targetMarker("circleHead")
                                );
                            }
                        }
                    }

                    if (HipieDDL.exists("onSelect.updates.visualization", item)) {
                        edges.push(new Edge()
                            .sourceVertex(vertexMap[item.id])
                            .targetVertex(vertexMap[item.onSelect.updates.visualization])
                            .targetMarker("arrowHead")
                            .text("on Select")
                        );
                    }
                }
            }
        });

        this.data({ vertices: vertices, edges: edges });
        GraphWidget.prototype.render.call(this);
    };

    return Graph;
}));