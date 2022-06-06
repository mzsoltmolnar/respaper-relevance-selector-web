// API documentation: https://api.semanticscholar.org/api-docs/graph#operation/get_graph_get_paper_search

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), "g"), replace);
}

function downloadFile(filename, text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function httpGet(url, callback) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      callback(xhttp.response);
    }
  };
  xhttp.open("GET", url, true);
  xhttp.send();
}

function searchQuerySemanticScholar(term, limit) {
  let formattedTerm = replaceAll(term, " ", "+");
  httpGet(
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${formattedTerm}&limit=${limit}&fields=title,authors,abstract,url,venue,externalIds,year`,
    processResults
  );
}

function inserTLDRtoCards(res) {
  resObj = JSON.parse(res);
  document.getElementById(`TLDR_${resObj.paperId}`).innerHTML =
    resObj.tldr?.text;
}

function getTLDR(paperId) {
  httpGet(
    `https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=tldr`,
    inserTLDRtoCards
  );
}

function onEnterPressed(e) {
  if (e.keyCode === 13) {
    onSearchButtonClick();
  }
}

function onSearchButtonClick() {
  articlesArray = [];
  document.getElementById("search_res_container").innerHTML = "";
  let limit = parseInt(document.getElementById("limit_input").value);
  let term = document.getElementById("search_query").value;
  searchQuerySemanticScholar(term, limit);
}

function getArticleString(
  author,
  title,
  journal,
  year,
  abstract,
  url,
  paperId,
  doi
) {
  return `@article{
            author  = "${author}"
            title   = "${title}",
            journal = "${journal}",
            year    = ${year},
            abstract = "${abstract}",
            url     = "${url}",
            paperId = "${paperId}",
            doi = "${doi}"
        }\n`;
}

function buildPapersString() {
  let papers = "";
  articlesArray.forEach((p) => {
    papers += getArticleString(
      getAuthorString(p.authors),
      p.title,
      p.venue ? p.venue : "",
      p.year ? p.year : "",
      p.abstract ? p.abstract : "",
      p.url,
      p.paperId,
      p.externalIds.DOI ? p.externalIds.DOI : ""
    );
  });

  return papers;
}

function onSaveButtonClick() {
  let fileName = `${document.getElementById("search_query").value}_${
    articlesArray.length
  }`;
  downloadFile(`${fileName}.bib`, buildPapersString());
}

function getAuthorString(authors) {
  let authorsStr = "";
  authors.forEach((a) => {
    authorsStr += `${a.name}; `;
  });
  return authorsStr;
}

var articlesArray = [];

function processResults(res) {
  resObj = JSON.parse(res);
  total = resObj.data.length;
  document.getElementById("paperCounter").innerHTML = total;

  articlesArray = resObj.data;

  articlesArray.forEach((r) => {
    authorsStr = getAuthorString(r.authors);
    document.getElementById("search_res_container").innerHTML += returnCardHtml(
      r.paperId,
      r.title,
      authorsStr,
      r.abstract,
      r.url
    );
    getTLDR(r.paperId);
  });
}

function onRejectClick(paperId) {
  let idx = articlesArray.findIndex((r) => r.paperId === paperId);
  articlesArray.splice(idx, 1);
  document.getElementById(paperId).remove();
  displayCount(articlesArray.length);
}

function onAcceptClick(paperId) {
  document.getElementById(paperId).remove();
}

function displayCount(count) {
  document.getElementById("paperCounter").innerHTML = count;
}

function returnCardHtml(paperId, title, authors, abstract, url) {
  return `
    <div id="${paperId}" class="card text-white bg-secondary mb-3">
        <div class="card-header">
            <span class="badge rounded-pill bg-primary">Title</span> ${title}
        </div>
        <div class="card-body">
            <p class="card-text"><button type="button" class="btn btn-danger me-sm-3" onclick="onRejectClick('${paperId}')">Reject</button> <button type="button" class="btn btn-success" onclick="onAcceptClick('${paperId}')">Accept</button></p>     
            <p class="card-text"><span class="badge rounded-pill bg-primary">TLDR</span> <span id="TLDR_${paperId}">-</span></p>
            <p class="card-text"><span class="badge rounded-pill bg-primary">Abstract</span> ${abstract}</p>    
            <p class="card-text"><span class="badge rounded-pill bg-primary">Author(s)</span> ${authors}</p>   
            <a class="card-text" href="${url}" target="_blank"><span class="badge rounded-pill bg-primary">URL</span> Open in Semantic Scholar</a> 
        </div>
    </div>`;
}
