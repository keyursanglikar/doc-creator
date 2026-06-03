const mammoth = require('mammoth');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');
const sharp = require('sharp');
const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
const path = require('path');

class CompleteDocxParser {
  constructor() {
    this.parser = new xml2js.Parser({ 
      explicitArray: false, 
      mergeAttrs: true,
      tagNameProcessors: [xml2js.processors.stripPrefix]
    });
    this.images = [];
    this.shapes = [];
    this.charts = [];
    this.equations = [];
  }

  async parseDocument(fileBuffer) {
    try {
      const zip = new AdmZip(fileBuffer);
      
      // Extract all necessary files
      const documentXml = zip.readAsText('word/document.xml');
      const stylesXml = zip.readAsText('word/styles.xml');
      const numberingXml = zip.readAsText('word/numbering.xml');
      const settingsXml = zip.readAsText('word/settings.xml');
      const commentsXml = zip.readAsText('word/comments.xml');
      const footnotesXml = zip.readAsText('word/footnotes.xml');
      const endnotesXml = zip.readAsText('word/endnotes.xml');
      
      // Parse XMLs
      const docJson = await this.parser.parseStringPromise(documentXml);
      const stylesJson = stylesXml ? await this.parser.parseStringPromise(stylesXml) : null;
      const numberingJson = numberingXml ? await this.parser.parseStringPromise(numberingXml) : null;
      
      // Extract all elements
      const images = await this.extractAllImages(zip);
      const shapes = await this.extractAllShapes(docJson);
      const charts = await this.extractAllCharts(zip, docJson);
      const equations = await this.extractAllEquations(docJson);
      const tables = await this.extractAllTables(docJson);
      const textBoxes = await this.extractTextboxes(docJson);
      const headers = await this.extractHeaders(zip);
      const footers = await this.extractFooters(zip);
      const watermarks = await this.extractWatermarks(zip);
      const comments = await this.extractComments(commentsXml);
      const hyperlinks = await this.extractHyperlinks(docJson);
      const bookmarks = await this.extractBookmarks(docJson);
      
      // Generate HTML with all elements
      let html = await this.generateFullHtml(fileBuffer, {
        images, shapes, charts, equations, tables, textBoxes,
        headers, footers, watermarks, comments, hyperlinks, bookmarks
      });
      
      // Extract metadata
      const metadata = await this.extractMetadata(zip);
      
      // Calculate page count
      const pages = this.calculatePages(docJson, metadata);
      
      return {
        html: html,
        rawText: this.extractRawText(docJson),
        images: images,
        shapes: shapes,
        charts: charts,
        equations: equations,
        tables: tables,
        textBoxes: textBoxes,
        metadata: metadata,
        pages: pages,
        wordCount: metadata.words || 0,
        characterCount: metadata.characters || 0
      };
      
    } catch (error) {
      console.error('DOCX parsing error:', error);
      throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
  }

  async extractAllImages(zip) {
    const images = [];
    const imageFiles = zip.getEntries().filter(entry => 
      entry.entryName.startsWith('word/media/') && 
      /\.(png|jpg|jpeg|gif|bmp|svg|webp|emf|wmf)$/i.test(entry.entryName)
    );
    
    for (const imageFile of imageFiles) {
      try {
        const imageData = zip.readFile(imageFile.entryName);
        const base64 = imageData.toString('base64');
        const contentType = this.getImageContentType(imageFile.entryName);
        
        // Get image dimensions using sharp
        let dimensions = { width: 0, height: 0 };
        try {
          const metadata = await sharp(imageData).metadata();
          dimensions = { width: metadata.width, height: metadata.height };
        } catch (e) {}
        
        images.push({
          id: path.basename(imageFile.entryName, path.extname(imageFile.entryName)),
          name: path.basename(imageFile.entryName),
          src: `data:${contentType};base64,${base64}`,
          contentType: contentType,
          size: imageData.length,
          dimensions: dimensions,
          alt: `Image ${path.basename(imageFile.entryName)}`
        });
      } catch (err) {
        console.error(`Failed to extract image ${imageFile.entryName}:`, err);
      }
    }
    
    return images;
  }

  async extractAllShapes(docJson) {
    const shapes = [];
    
    const findShapes = (obj, path = '') => {
      if (obj && typeof obj === 'object') {
        // Check for shapes in drawing elements
        if (obj.drawing || obj.pict) {
          const shapeData = this.parseShape(obj);
          if (shapeData) {
            shapes.push(shapeData);
          }
        }
        
        // Check for specific shape types
        if (obj.shape) {
          shapes.push(this.parseVMLShape(obj.shape));
        }
        
        if (obj.wsp) { // Word Drawing Canvas shape
          shapes.push(this.parseWspShape(obj.wsp));
        }
        
        // Recursively search
        for (const key in obj) {
          findShapes(obj[key], `${path}.${key}`);
        }
      }
    };
    
    findShapes(docJson);
    
    return shapes;
  }

  parseShape(shapeElement) {
    try {
      const shape = {
        type: 'unknown',
        properties: {},
        styles: {}
      };
      
      // Detect shape type
      if (shapeElement.drawing) {
        shape.type = 'drawing';
        if (shapeElement.drawing.inline || shapeElement.drawing.anchor) {
          const graphic = shapeElement.drawing.inline?.graphic || shapeElement.drawing.anchor?.graphic;
          if (graphic?.graphicData) {
            const graphicData = graphic.graphicData;
            if (graphicData.pic) {
              shape.type = 'picture';
              // Extract picture properties
              if (graphicData.pic.nvPicPr?.cNvPr) {
                shape.name = graphicData.pic.nvPicPr.cNvPr.name || 'Picture';
                shape.altText = graphicData.pic.nvPicPr.cNvPr.descr || '';
              }
            } else if (graphicData.wsp) {
              shape.type = 'shape';
              shape.properties = this.extractShapeProperties(graphicData.wsp);
            }
          }
        }
      }
      
      return shape;
    } catch (err) {
      return null;
    }
  }

  parseVMLShape(shapeElement) {
    return {
      type: 'vml',
      properties: {
        id: shapeElement.$.id || null,
        type: shapeElement.$.type || null,
        style: shapeElement.$.style || null,
        fillcolor: shapeElement.$.fillcolor || null,
        strokecolor: shapeElement.$.strokecolor || null
      }
    };
  }

  parseWspShape(wspElement) {
    return {
      type: 'word_shape',
      properties: {
        id: wspElement.$.id || null,
        anchor: wspElement.$.anchor || null,
        relativeHeight: wspElement.$.relativeHeight || null
      }
    };
  }

  extractShapeProperties(wsp) {
    const props = {};
    if (wsp.spPr) {
      if (wsp.spPr.xfrm) props.transform = wsp.spPr.xfrm;
      if (wsp.spPr.prstGeom) props.presetGeometry = wsp.spPr.prstGeom.$.prst;
      if (wsp.spPr.solidFill) props.fill = wsp.spPr.solidFill;
      if (wsp.spPr.ln) props.line = wsp.spPr.ln;
    }
    return props;
  }

  async extractAllCharts(zip, docJson) {
    const charts = [];
    const chartFiles = zip.getEntries().filter(entry => 
      entry.entryName.startsWith('word/charts/') && 
      entry.entryName.endsWith('.xml')
    );
    
    for (const chartFile of chartFiles) {
      try {
        const chartXml = zip.readAsText(chartFile.entryName);
        const chartJson = await this.parser.parseStringPromise(chartXml);
        
        const chart = {
          id: path.basename(chartFile.entryName, '.xml'),
          type: this.detectChartType(chartJson),
          title: this.extractChartTitle(chartJson),
          data: this.extractChartData(chartJson),
          colors: this.extractChartColors(chartJson),
          xml: chartXml
        };
        
        charts.push(chart);
      } catch (err) {
        console.error(`Failed to extract chart ${chartFile.entryName}:`, err);
      }
    }
    
    return charts;
  }

  detectChartType(chartJson) {
    if (chartJson.chart?.plotArea) {
      const plotArea = chartJson.chart.plotArea;
      if (plotArea.barChart) return 'bar';
      if (plotArea.lineChart) return 'line';
      if (plotArea.pieChart) return 'pie';
      if (plotArea.areaChart) return 'area';
      if (plotArea.scatterChart) return 'scatter';
      if (plotArea.radarChart) return 'radar';
      if (plotArea.stockChart) return 'stock';
      if (plotArea.surfaceChart) return 'surface';
      if (plotArea.doughnutChart) return 'doughnut';
      if (plotArea.bubbleChart) return 'bubble';
    }
    return 'unknown';
  }

  extractChartTitle(chartJson) {
    try {
      if (chartJson.chart?.title?.tx?.rich?.p?.r?.t) {
        return chartJson.chart.title.tx.rich.p.r.t;
      }
      if (chartJson.chart?.title?.tx?.strRef?.str) {
        return chartJson.chart.title.tx.strRef.str;
      }
    } catch (err) {}
    return 'Chart';
  }

  extractChartData(chartJson) {
    const data = [];
    try {
      if (chartJson.chart?.plotArea) {
        const series = chartJson.chart.plotArea.barChart?.ser || 
                      chartJson.chart.plotArea.lineChart?.ser ||
                      [];
        
        if (Array.isArray(series)) {
          for (const s of series) {
            const seriesData = {
              name: s.tx?.strRef?.str || s.tx?.v || 'Series',
              values: []
            };
            
            if (s.val?.numRef?.numCache?.pt) {
              const points = Array.isArray(s.val.numRef.numCache.pt) ? 
                s.val.numRef.numCache.pt : [s.val.numRef.numCache.pt];
              
              for (const point of points) {
                seriesData.values.push({
                  index: point.$.idx,
                  value: point.v
                });
              }
            }
            data.push(seriesData);
          }
        }
      }
    } catch (err) {}
    return data;
  }

  extractChartColors(chartJson) {
    const colors = [];
    try {
      if (chartJson.chart?.colors) {
        // Extract color information
      }
    } catch (err) {}
    return colors;
  }

  async extractAllEquations(docJson) {
    const equations = [];
    
    const findEquations = (obj) => {
      if (obj && typeof obj === 'object') {
        // Check for Office Math (OMML) elements
        if (obj.omath || obj.omathPara) {
          const equation = this.parseEquation(obj);
          if (equation) {
            equations.push(equation);
          }
        }
        
        for (const key in obj) {
          findEquations(obj[key]);
        }
      }
    };
    
    findEquations(docJson);
    
    return equations;
  }

  parseEquation(equationElement) {
    try {
      // Convert OMML to MathML
      const mathml = this.convertOMMLtoMathML(equationElement);
      return {
        type: 'equation',
        mathml: mathml,
        latex: this.convertMathMLtoLaTeX(mathml),
        raw: equationElement
      };
    } catch (err) {
      return null;
    }
  }

  convertOMMLtoMathML(omathElement) {
    // Simplified conversion - in production, use a proper OMML to MathML converter
    let mathml = '<math xmlns="http://www.w3.org/1998/Math/MathML">';
    
    // Add basic structure
    mathml += '<mrow>';
    
    // Parse equation structure
    if (omathElement.omath) {
      // Add content
      mathml += '<mi>x</mi><mo>+</mo><mi>y</mi><mo>=</mo><mi>z</mi>';
    }
    
    mathml += '</mrow></math>';
    
    return mathml;
  }

  convertMathMLtoLaTeX(mathml) {
    // Simplified conversion - in production, use a proper MathML to LaTeX converter
    return 'x + y = z';
  }

  async extractAllTables(docJson) {
    const tables = [];
    
    const findTables = (obj, tableIndex = 0) => {
      if (obj && typeof obj === 'object') {
        if (obj.tbl) {
          const table = this.parseTable(obj.tbl, tableIndex);
          tables.push(table);
        }
        
        for (const key in obj) {
          findTables(obj[key], tableIndex + 1);
        }
      }
    };
    
    findTables(docJson);
    
    return tables;
  }

  parseTable(tableElement, index) {
    const table = {
      id: index,
      rows: [],
      properties: this.extractTableProperties(tableElement.tblPr),
      style: {}
    };
    
    if (tableElement.tr) {
      const rows = Array.isArray(tableElement.tr) ? tableElement.tr : [tableElement.tr];
      
      for (const row of rows) {
        const tableRow = {
          cells: [],
          properties: this.extractRowProperties(row.trPr)
        };
        
        if (row.tc) {
          const cells = Array.isArray(row.tc) ? row.tc : [row.tc];
          
          for (const cell of cells) {
            const tableCell = {
              content: this.extractCellContent(cell),
              properties: this.extractCellProperties(cell.tcPr),
              colspan: 1,
              rowspan: 1
            };
            
            // Check for merged cells
            if (cell.tcPr) {
              if (cell.tcPr.gridSpan) {
                tableCell.colspan = parseInt(cell.tcPr.gridSpan.$.val) || 1;
              }
              if (cell.tcPr.vMerge) {
                tableCell.rowspan = parseInt(cell.tcPr.vMerge.$.val) || 1;
              }
            }
            
            tableRow.cells.push(tableCell);
          }
        }
        
        table.rows.push(tableRow);
      }
    }
    
    return table;
  }

  extractTableProperties(properties) {
    const props = {};
    if (properties) {
      if (properties.tblStyle) props.style = properties.tblStyle.$.val;
      if (properties.tblW) props.width = properties.tblW.$.w;
      if (properties.tblBorders) props.borders = properties.tblBorders;
      if (properties.tblCellMar) props.cellMargin = properties.tblCellMar;
    }
    return props;
  }

  extractRowProperties(properties) {
    const props = {};
    if (properties) {
      if (properties.trHeight) props.height = properties.trHeight.$.val;
      if (properties.tblHeader) props.isHeader = true;
    }
    return props;
  }

  extractCellProperties(properties) {
    const props = {};
    if (properties) {
      if (properties.tcW) props.width = properties.tcW.$.w;
      if (properties.shd) props.shading = properties.shd;
      if (properties.vAlign) props.verticalAlign = properties.vAlign.$.val;
      if (properties.tcBorders) props.borders = properties.tcBorders;
    }
    return props;
  }

  extractCellContent(cell) {
    let content = '';
    
    if (cell.p) {
      const paragraphs = Array.isArray(cell.p) ? cell.p : [cell.p];
      for (const para of paragraphs) {
        content += this.extractParagraphText(para) + '\n';
      }
    }
    
    return content.trim();
  }

  extractParagraphText(paragraph) {
    let text = '';
    
    if (paragraph.r) {
      const runs = Array.isArray(paragraph.r) ? paragraph.r : [paragraph.r];
      for (const run of runs) {
        if (run.t && typeof run.t === 'string') {
          text += run.t;
        } else if (run.t && run.t._) {
          text += run.t._;
        }
      }
    }
    
    return text;
  }

  async extractTextboxes(docJson) {
    const textboxes = [];
    
    const findTextboxes = (obj) => {
      if (obj && typeof obj === 'object') {
        if (obj.textbox || obj.txbx) {
          const textbox = this.parseTextbox(obj);
          if (textbox) textboxes.push(textbox);
        }
        
        for (const key in obj) {
          findTextboxes(obj[key]);
        }
      }
    };
    
    findTextboxes(docJson);
    
    return textboxes;
  }

  parseTextbox(textboxElement) {
    try {
      return {
        type: 'textbox',
        content: this.extractTextboxContent(textboxElement),
        position: this.extractTextboxPosition(textboxElement),
        properties: {
          border: textboxElement.$.border || 'none',
          fill: textboxElement.$.fill || 'none'
        }
      };
    } catch (err) {
      return null;
    }
  }

  extractTextboxContent(textboxElement) {
    let content = '';
    if (textboxElement.txbxContent?.p) {
      const paras = Array.isArray(textboxElement.txbxContent.p) ? 
        textboxElement.txbxContent.p : [textboxElement.txbxContent.p];
      
      for (const para of paras) {
        content += this.extractParagraphText(para) + '<br/>';
      }
    }
    return content;
  }

  extractTextboxPosition(textboxElement) {
    return {
      x: textboxElement.$.left || 0,
      y: textboxElement.$.top || 0,
      width: textboxElement.$.width || 'auto',
      height: textboxElement.$.height || 'auto'
    };
  }

  async extractHeaders(zip) {
    const headers = [];
    const headerFiles = zip.getEntries().filter(entry => 
      entry.entryName.startsWith('word/header') && entry.entryName.endsWith('.xml')
    );
    
    for (const headerFile of headerFiles) {
      try {
        const headerXml = zip.readAsText(headerFile.entryName);
        const headerJson = await this.parser.parseStringPromise(headerXml);
        headers.push({
          type: path.basename(headerFile.entryName, '.xml'),
          content: this.extractHeaderFooterContent(headerJson)
        });
      } catch (err) {}
    }
    
    return headers;
  }

  async extractFooters(zip) {
    const footers = [];
    const footerFiles = zip.getEntries().filter(entry => 
      entry.entryName.startsWith('word/footer') && entry.entryName.endsWith('.xml')
    );
    
    for (const footerFile of footerFiles) {
      try {
        const footerXml = zip.readAsText(footerFile.entryName);
        const footerJson = await this.parser.parseStringPromise(footerXml);
        footers.push({
          type: path.basename(footerFile.entryName, '.xml'),
          content: this.extractHeaderFooterContent(footerJson)
        });
      } catch (err) {}
    }
    
    return footers;
  }

  extractHeaderFooterContent(headerFooterJson) {
    let content = '';
    if (headerFooterJson.h?.p) {
      const paras = Array.isArray(headerFooterJson.h.p) ? 
        headerFooterJson.h.p : [headerFooterJson.h.p];
      
      for (const para of paras) {
        content += this.extractParagraphText(para) + ' ';
      }
    }
    return content.trim();
  }

  async extractWatermarks(zip) {
    const watermarks = [];
    try {
      const headerFiles = zip.getEntries().filter(entry => 
        entry.entryName.startsWith('word/header') && entry.entryName.endsWith('.xml')
      );
      
      for (const headerFile of headerFiles) {
        const headerXml = zip.readAsText(headerFile.entryName);
        if (headerXml.includes('watermark') || headerXml.includes('w:watermark')) {
          const headerJson = await this.parser.parseStringPromise(headerXml);
          const watermark = this.parseWatermark(headerJson);
          if (watermark) watermarks.push(watermark);
        }
      }
    } catch (err) {}
    
    return watermarks;
  }

  parseWatermark(headerJson) {
    try {
      // Extract watermark text and properties
      return {
        text: 'CONFIDENTIAL', // Extract from XML
        type: 'text',
        opacity: 0.3,
        rotation: -45
      };
    } catch (err) {
      return null;
    }
  }

  async extractComments(commentsXml) {
    if (!commentsXml) return [];
    
    try {
      const commentsJson = await this.parser.parseStringPromise(commentsXml);
      const comments = [];
      
      if (commentsJson.comments?.comment) {
        const commentList = Array.isArray(commentsJson.comments.comment) ?
          commentsJson.comments.comment : [commentsJson.comments.comment];
        
        for (const comment of commentList) {
          comments.push({
            id: comment.$.id,
            author: comment.$.author || 'Unknown',
            date: comment.$.date || new Date().toISOString(),
            text: this.extractParagraphText(comment)
          });
        }
      }
      
      return comments;
    } catch (err) {
      return [];
    }
  }

  async extractHyperlinks(docJson) {
    const hyperlinks = [];
    
    const findHyperlinks = (obj) => {
      if (obj && typeof obj === 'object') {
        if (obj.hyperlink || obj.hlink) {
          const link = this.parseHyperlink(obj);
          if (link) hyperlinks.push(link);
        }
        
        for (const key in obj) {
          findHyperlinks(obj[key]);
        }
      }
    };
    
    findHyperlinks(docJson);
    
    return hyperlinks;
  }

  parseHyperlink(hyperlinkElement) {
    try {
      return {
        url: hyperlinkElement.$.anchor || hyperlinkElement.$.id || '',
        text: this.extractParagraphText(hyperlinkElement),
        type: hyperlinkElement.$.anchor ? 'internal' : 'external'
      };
    } catch (err) {
      return null;
    }
  }

  async extractBookmarks(docJson) {
    const bookmarks = [];
    
    const findBookmarks = (obj) => {
      if (obj && typeof obj === 'object') {
        if (obj.bookmarkStart || obj.bookmarkEnd) {
          const bookmark = this.parseBookmark(obj);
          if (bookmark) bookmarks.push(bookmark);
        }
        
        for (const key in obj) {
          findBookmarks(obj[key]);
        }
      }
    };
    
    findBookmarks(docJson);
    
    return bookmarks;
  }

  parseBookmark(bookmarkElement) {
    try {
      return {
        id: bookmarkElement.$.id,
        name: bookmarkElement.$.name,
        type: bookmarkElement.bookmarkStart ? 'start' : 'end'
      };
    } catch (err) {
      return null;
    }
  }

  async generateFullHtml(fileBuffer, elements) {
    // Primary HTML conversion using mammoth
    const mammothResult = await mammoth.convertToHtml(
      { buffer: fileBuffer },
      {
        styleMap: [
          "p[style-name='Heading1'] => h1:fresh",
          "p[style-name='Heading2'] => h2:fresh",
          "p[style-name='Heading3'] => h3:fresh",
          "p[style-name='Heading4'] => h4:fresh",
          "p[style-name='Title'] => h1.title:fresh",
          "p[style-name='Subtitle'] => h2.subtitle:fresh",
          "p[style-name='Normal'] => p:fresh",
          "r[style-name='Strong'] => strong",
          "r[style-name='Emphasis'] => em",
          "u => u",
          "strike => s",
          "p[style-name='ListParagraph'] => p:fresh",
          "p[style-name='Quote'] => blockquote:fresh",
          "p[style-name='Caption'] => figcaption:fresh",
        ],
        convertImage: mammoth.images.imgElement(async (image) => {
          try {
            const imageBuffer = await image.read();
            const base64 = imageBuffer.toString('base64');
            const contentType = image.contentType || 'image/png';
            return {
              src: `data:${contentType};base64,${base64}`,
              alt: image.altText || 'Document image'
            };
          } catch (err) {
            return { src: '' };
          }
        })
      }
    );
    
    let html = mammothResult.value;
    
    // Add images
    if (elements.images && elements.images.length > 0) {
      html += '<div class="docx-images" style="display: none;">';
      for (const image of elements.images) {
        html += `<img data-image-id="${image.id}" src="${image.src}" alt="${image.alt}" style="max-width: 100%;"/>`;
      }
      html += '</div>';
    }
    
    // Add shapes as SVG
    if (elements.shapes && elements.shapes.length > 0) {
      html += '<div class="docx-shapes">';
      for (const shape of elements.shapes) {
        html += this.generateShapeSVG(shape);
      }
      html += '</div>';
    }
    
    // Add charts
    if (elements.charts && elements.charts.length > 0) {
      html += '<div class="docx-charts">';
      for (const chart of elements.charts) {
        html += this.generateChartHTML(chart);
      }
      html += '</div>';
    }
    
    // Add equations
    if (elements.equations && elements.equations.length > 0) {
      html += '<div class="docx-equations">';
      for (const equation of elements.equations) {
        html += `<div class="equation">${equation.mathml}</div>`;
      }
      html += '</div>';
    }
    
    // Wrap in full document structure
    return this.wrapInDocumentStructure(html, elements, mammothResult.messages);
  }

  generateShapeSVG(shape) {
    // Generate SVG representation of shape
    let svg = '';
    
    switch(shape.type) {
      case 'rectangle':
        svg = `<svg width="100" height="50" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100" height="50" fill="${shape.properties.fill || 'blue'}" 
                        stroke="${shape.properties.stroke || 'black'}" 
                        stroke-width="${shape.properties.strokeWidth || 2}"/>
                </svg>`;
        break;
      case 'circle':
        svg = `<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="25" cy="25" r="20" fill="${shape.properties.fill || 'red'}"/>
                </svg>`;
        break;
      case 'arrow':
        svg = `<svg width="100" height="20" xmlns="http://www.w3.org/2000/svg">
                  <line x1="0" y1="10" x2="80" y2="10" stroke="black" stroke-width="2"/>
                  <polygon points="80,5 90,10 80,15" fill="black"/>
                </svg>`;
        break;
      default:
        svg = `<div class="shape-placeholder">[Shape: ${shape.type}]</div>`;
    }
    
    return svg;
  }

  generateChartHTML(chart) {
    // Generate chart representation
    return `
      <div class="chart" data-chart-type="${chart.type}">
        <h4>${chart.title}</h4>
        <div class="chart-data">
          <pre>${JSON.stringify(chart.data, null, 2)}</pre>
        </div>
      </div>
    `;
  }

  wrapInDocumentStructure(html, elements, warnings) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif;
            background: #f5f5f5;
            padding: 40px 20px;
          }
          
          .docx-container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
            border-radius: 8px;
            padding: 60px 80px;
            position: relative;
          }
          
          /* Page breaks */
          .page-break {
            page-break-before: always;
            margin: 40px 0;
            border-top: 2px dashed #ccc;
            position: relative;
          }
          
          .page-break::before {
            content: "▼ Page Break ▼";
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 0 10px;
            font-size: 12px;
            color: #999;
          }
          
          /* Headers */
          h1, h2, h3, h4 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: bold;
            page-break-after: avoid;
          }
          
          h1 { font-size: 28pt; }
          h2 { font-size: 24pt; }
          h3 { font-size: 20pt; }
          h4 { font-size: 16pt; }
          
          /* Paragraphs */
          p {
            margin-bottom: 12px;
            line-height: 1.5;
          }
          
          /* Tables */
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            border: 1px solid #ddd;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
            vertical-align: top;
          }
          
          th {
            background: #f5f5f5;
            font-weight: bold;
          }
          
          /* Lists */
          ul, ol {
            margin: 12px 0;
            padding-left: 40px;
          }
          
          li {
            margin: 6px 0;
          }
          
          /* Images */
          img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 20px auto;
          }
          
          /* Shapes and charts */
          .docx-shapes svg,
          .chart {
            margin: 20px auto;
            display: block;
            text-align: center;
          }
          
          /* Equations */
          .equation {
            margin: 20px 0;
            padding: 10px;
            background: #f9f9f9;
            border-left: 3px solid #4CAF50;
            overflow-x: auto;
          }
          
          /* Comments */
          .comment {
            background: #fff3cd;
            border-left: 3px solid #ffc107;
            padding: 10px;
            margin: 10px 0;
            font-size: 12px;
          }
          
          /* Text boxes */
          .textbox {
            border: 1px solid #ccc;
            background: #f9f9f9;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          
          /* Print styles */
          @media print {
            body {
              background: white;
              padding: 0;
            }
            
            .docx-container {
              box-shadow: none;
              padding: 0;
            }
            
            .page-break {
              page-break-before: always;
              border: none;
            }
            
            .page-break::before {
              display: none;
            }
          }
          
          /* Responsive */
          @media (max-width: 768px) {
            .docx-container {
              padding: 20px;
            }
            
            table {
              font-size: 12px;
            }
            
            th, td {
              padding: 4px 6px;
            }
          }
        </style>
      </head>
      <body>
        <div class="docx-container">
          ${html}
        </div>
        
        ${warnings && warnings.length > 0 ? `
          <div style="display: none;" class="warnings">
            ${warnings.map(w => `<div>${w}</div>`).join('')}
          </div>
        ` : ''}
      </body>
      </html>
    `;
  }

  async extractMetadata(zip) {
    try {
      const coreXml = zip.readAsText('docProps/core.xml');
      const appXml = zip.readAsText('docProps/app.xml');
      
      const core = await this.parser.parseStringPromise(coreXml);
      const app = await this.parser.parseStringPromise(appXml);
      
      return {
        title: core?.['cp:coreProperties']?.['dc:title']?.[0] || 'Untitled',
        subject: core?.['cp:coreProperties']?.['dc:subject']?.[0] || '',
        author: core?.['cp:coreProperties']?.['dc:creator']?.[0] || 'Unknown',
        lastModifiedBy: core?.['cp:coreProperties']?.['cp:lastModifiedBy']?.[0] || '',
        created: core?.['cp:coreProperties']?.['dcterms:created']?.[0] || new Date().toISOString(),
        modified: core?.['cp:coreProperties']?.['dcterms:modified']?.[0] || new Date().toISOString(),
        pages: app?.['Properties']?.['Pages']?.[0] || 1,
        words: app?.['Properties']?.['Words']?.[0] || 0,
        characters: app?.['Properties']?.['Characters']?.[0] || 0,
        lines: app?.['Properties']?.['Lines']?.[0] || 0,
        paragraphs: app?.['Properties']?.['Paragraphs']?.[0] || 0,
        company: app?.['Properties']?.['Company']?.[0] || '',
        category: app?.['Properties']?.['Category']?.[0] || '',
        manager: app?.['Properties']?.['Manager']?.[0] || ''
      };
    } catch (err) {
      return {
        title: 'Uploaded Document',
        author: 'Unknown',
        pages: 1,
        words: 0,
        characters: 0
      };
    }
  }

  extractRawText(docJson) {
    let text = '';
    const extractText = (obj) => {
      if (typeof obj === 'string') {
        text += obj + ' ';
      } else if (obj && typeof obj === 'object') {
        for (const key in obj) {
          extractText(obj[key]);
        }
      }
    };
    extractText(docJson);
    return text.replace(/\s+/g, ' ').trim();
  }

  calculatePages(docJson, metadata) {
    // Estimate pages based on content
    const rawText = this.extractRawText(docJson);
    const textLength = rawText.length;
    const estimatedPages = Math.max(metadata.pages || 1, Math.ceil(textLength / 3000));
    return estimatedPages;
  }

  getImageContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const types = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.emf': 'image/emf',
      '.wmf': 'image/wmf'
    };
    return types[ext] || 'image/png';
  }
}

module.exports = CompleteDocxParser;