// ==UserScript==
// @name         华南理工作业互评增强版 v6.0
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  4种模式：默认满分/AI自动评分/导出题目数据/导入评分结果。支持10+供应商，双重冷却防刷，跳过已评，max_tokens=5000兼容思考模型
// @author       WanderLandWalker
// @match        http://1024.se.scut.edu.cn/*
// @match        https://1024.se.scut.edu.cn/*
// @grant        none
// @license      GPL-3.0
// @downloadURL  https://raw.githubusercontent.com/WanderLandWalker/SCUT_Auto_Grader/master/SCUT_Auto_Grader.user.js
// @updateURL    https://raw.githubusercontent.com/WanderLandWalker/SCUT_Auto_Grader/master/SCUT_Auto_Grader.meta.js
// ==/UserScript==

(function () {
    'use strict';
    try {

    var PROVIDERS = [
        { name: 'DeepSeek',       url: 'https://api.deepseek.com/v1',              models: ['deepseek-chat', 'deepseek-reasoner'] },
        { name: 'OpenAI',         url: 'https://api.openai.com/v1',                models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
        { name: '通义千问(阿里)',  url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen-long'] },
        { name: '硅基流动',       url: 'https://api.siliconflow.cn/v1',             models: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen2.5-72B-Instruct'] },
        { name: '智谱(GLM)',      url: 'https://open.bigmodel.cn/api/paas/v4',     models: ['glm-4-flash', 'glm-4', 'glm-4-plus'] },
        { name: '月之暗面(Kimi)',  url: 'https://api.moonshot.cn/v1',                models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'] },
        { name: '豆包(字节)',      url: 'https://ark.cn-beijing.volces.com/api/v3',  models: ['doubao-1.5-pro-32k', 'doubao-1.5-lite-32k'] },
        { name: '百川',           url: 'https://api.baichuan-ai.com/v1',            models: ['Baichuan4'] },
        { name: '零一万物',        url: 'https://api.lingyiwanwu.com/v1',            models: ['yi-large', 'yi-medium'] },
        { name: '自定义',          url: '',                                          models: [] }
    ];

    var AI_PROMPT = '你是大学操作系统课程的作业评分助教。根据参考答案对学生回答评分。满分100分，根据回答质量给分：核心思路正确完整90-100，基本正确有小错70-89，部分正确有明显错误50-69，大部分错误30-49，完全错误0-29。评语50字以内中文。重要要求：必须且只能返回纯JSON格式，绝不能包含任何Markdown标记(如```json)，绝不能包含任何解释性文字！格式严格为：{"score":分数,"comment":"评语"}';

    var P = document.createElement('div');
    P.id = 'gp44';

    var providerOpts = '';
    for (var pi = 0; pi < PROVIDERS.length; pi++) providerOpts += '<option value="'+pi+'">'+PROVIDERS[pi].name+'</option>';

    P.innerHTML = ''
+'<style>'
+'#gp44{position:fixed;top:12px;right:12px;z-index:99999;width:380px;max-height:92vh;overflow-y:auto;background:linear-gradient(180deg,#1e1e2e 0%,#181825 100%);color:#cdd6f4;border:1px solid #313244;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.6);font-family:"Segoe UI",system-ui,sans-serif;font-size:13px;line-height:1.4}'
+'#gp44 *{box-sizing:border-box;margin:0;padding:0}'
+'#gp44 .hdr{background:linear-gradient(135deg,#89b4fa,#cba6f7);padding:14px 18px;border-radius:15px 15px 0 0;display:flex;justify-content:space-between;align-items:center}'
+'#gp44 .hdr h3{font-size:15px;font-weight:700;color:#1e1e2e;margin:0}'
+'#gp44 .hdr .btn-min{background:rgba(30,30,46,.2);border:none;color:#1e1e2e;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center}'
+'#gp44 .hdr .btn-min:hover{background:rgba(30,30,46,.4)}'
+'#gp44 .bd{padding:14px 16px}'
+'#gp44 .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6c7086;margin:10px 0 6px}'
+'#gp44 .modes{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}'
+'#gp44 .modes .m{padding:10px 6px;border:2px solid #313244;border-radius:10px;background:#1e1e2e;color:#a6adc8;cursor:pointer;text-align:center;font-size:12px;font-weight:600;transition:all .2s}'
+'#gp44 .modes .m:hover{border-color:#89b4fa;color:#cdd6f4;background:#1e1e2e}'
+'#gp44 .modes .m.on{border-color:#89b4fa;background:rgba(137,180,250,.1);color:#89b4fa;box-shadow:0 0 12px rgba(137,180,250,.15)}'
+'#gp44 .card{background:#1e1e2e;border:1px solid #313244;border-radius:10px;padding:10px 12px;margin:6px 0}'
+'#gp44 label{display:block;font-size:11px;font-weight:600;color:#6c7086;margin:8px 0 4px}'
+'#gp44 input[type="text"],#gp44 input[type="password"],#gp44 textarea,#gp44 select{width:100%;padding:8px 10px;border:1px solid #313244;border-radius:8px;background:#181825;color:#cdd6f4;font-size:12px;font-family:inherit;outline:none;transition:border-color .2s}'
+'#gp44 input:focus,#gp44 textarea:focus,#gp44 select:focus{border-color:#89b4fa}'
+'#gp44 select{cursor:pointer;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236c7086\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px}'
+'#gp44 select[size]{background-image:none;padding-right:10px}'
+'#gp44 select[size] option{padding:6px 8px;cursor:pointer;border-radius:4px}'
+'#gp44 select[size] option:hover{background:rgba(137,180,250,.15)}'
+'#gp44 textarea{resize:vertical;min-height:50px}'
+'#gp44 .hint{font-size:10px;color:#585b70;margin-top:3px}'
+'#gp44 .row{display:flex;gap:6px;align-items:end}'
+'#gp44 .row>*{flex:1}'
+'#gp44 .row .shrink{flex:none;width:auto}'
+'#gp44 .btn{width:100%;padding:11px;border:none;border-radius:10px;color:#1e1e2e;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit;letter-spacing:.3px}'
+'#gp44 .btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.3)}'
+'#gp44 .btn:active{transform:translateY(0)}'
+'#gp44 .btn-green{background:linear-gradient(135deg,#a6e3a1,#94e2d5)}'
+'#gp44 .btn-red{background:linear-gradient(135deg,#f38ba8,#eba0ac)}'
+'#gp44 .btn-blue{background:linear-gradient(135deg,#89b4fa,#74c7ec)}'
+'#gp44 .btn-purple{background:linear-gradient(135deg,#cba6f7,#f5c2e7)}'
+'#gp44 .btn-orange{background:linear-gradient(135deg,#fab387,#f9e2af)}'
+'#gp44 .btn-sm{padding:8px 12px;font-size:11px;width:auto;display:inline-block}'
+'#gp44 .btn-row{display:flex;gap:6px;margin:8px 0}'
+'#gp44 .btn-row .btn{flex:1}'
+'#gp44 .status-bar{text-align:center;padding:8px;border-radius:8px;background:#181825;border:1px solid #313244;font-size:12px;font-weight:600;margin:8px 0}'
+'#gp44 .log{margin-top:8px;padding:8px;border-radius:8px;background:#11111b;border:1px solid #1e1e2e;max-height:160px;overflow-y:auto;font-family:"Cascadia Code","Fira Code",Consolas,monospace;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-all}'
+'#gp44 .log .i{color:#89dceb}#gp44 .log .o{color:#a6e3a1}#gp44 .log .w{color:#f9e2af}#gp44 .log .e{color:#f38ba8}'
+'#gp44 .toggle-wrap{margin:8px 0;padding:8px 12px;background:#1e1e2e;border:1px solid #313244;border-radius:10px;display:flex;align-items:center;justify-content:space-between}'
+'#gp44 .toggle-wrap span{font-size:12px;color:#a6adc8}'
+'#gp44 .toggle{position:relative;width:44px;height:24px;cursor:pointer}'
+'#gp44 .toggle input{display:none}'
+'#gp44 .toggle .slider{position:absolute;inset:0;background:#313244;border-radius:12px;transition:.3s}'
+'#gp44 .toggle .slider::after{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;background:#585b70;border-radius:50%;transition:.3s}'
+'#gp44 .toggle input:checked+.slider{background:#a6e3a1}'
+'#gp44 .toggle input:checked+.slider::after{left:23px;background:#1e1e2e}'
+'#gp44 .mode-hint{margin:6px 0;padding:10px;border-radius:8px;background:#181825;border:1px solid #313244;font-size:11px;color:#a6adc8;line-height:1.6}'
+'#gp44 .copy-box{margin-top:8px}'
+'#gp44 .copy-box .success{background:#1a3a2a;border:1px solid #2d7a4f;border-radius:10px;padding:12px;margin-bottom:8px}'
+'#gp44 .copy-box .success h4{color:#a6e3a1;font-size:13px;margin-bottom:6px}'
+'#gp44 .copy-box .success ol{color:#cdd6f4;font-size:12px;line-height:2;padding-left:18px}'
+'#gp44 .copy-box .success ol li b{color:#f9e2af}'
+'</style>'
+'<div class="hdr"><h3>互评助手 v6.0</h3><button type="button" class="btn-min" id="gp-min">-</button></div>'
+'<div class="bd" id="gp-body">'
+'  <div class="status-bar" id="gp-st"><span id="gp-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#a6e3a1;margin-right:6px;vertical-align:middle"></span><span id="gp-st-text">就绪</span></div>'
+'  <div class="section-title">评分模式</div>'
+'  <div class="modes" id="gp-modes">'
+'    <div class="m on" data-m="full">默认满分</div>'
+'    <div class="m" data-m="ai">AI自动评分</div>'
+'    <div class="m" data-m="export">导出题目数据</div>'
+'    <div class="m" data-m="import">导入评分结果</div>'
+'  </div>'
+'  <div id="gp-mode-hint" class="mode-hint"><b style="color:#a6e3a1">默认满分：</b>所有学生直接打100分，自动遍历</div>'
+'  <div id="gp-ai" style="display:none" class="card">'
+'    <label>供应商</label>'
+'    <select id="gp-provider">'+providerOpts+'</select>'
+'    <label>API Base URL</label>'
+'    <input type="text" id="gp-url" placeholder="自动填充或手动输入">'
+'    <label>API Key</label>'
+'    <input type="password" id="gp-key" placeholder="sk-...">'
+'    <label>模型</label>'
+'    <div class="row">'
+'      <div><input type="text" id="gp-mdl" placeholder="选择或手动输入模型名称"></div>'
+'      <div class="shrink"><button type="button" class="btn btn-orange btn-sm" id="gp-fetch">获取</button></div>'
+'    </div>'
+'    <select id="gp-mdl-sel" size="5" style="display:none;margin-top:4px;font-size:11px"></select>'
+'    <div class="hint" id="gp-mdl-ht">选供应商 → 填Key → 点获取模型</div>'
+'    <div style="margin-top:4px"><button type="button" class="btn btn-red btn-sm" id="gp-clear-key" style="width:auto;padding:4px 10px;font-size:10px">清除已保存的API Key</button></div>'
+'  </div>'
+'  <div id="gp-imp" style="display:none" class="card">'
+'    <label>粘贴AI返回的JSON</label>'
+'    <textarea id="gp-paste" rows="5" placeholder=\'[{"id":1,"score":90,"comment":"评语"},...]\'></textarea>'
+'    <button type="button" class="btn btn-purple" id="gp-paste-btn" style="margin-top:6px">导入粘贴的评分</button>'
+'    <div class="hint" style="margin:6px 0">或从文件导入：</div>'
+'    <input type="file" id="gp-file" accept=".json" style="font-size:11px">'
+'  </div>'
+'  <div class="toggle-wrap">'
+'    <span>跳过已评过的学生</span>'
+'    <label class="toggle"><input type="checkbox" id="gp-skip" checked="checked"><span class="slider"></span></label>'
+'  </div>'
+'  <div class="btn-row">'
+'    <button type="button" class="btn btn-green" id="gp-go">开始</button>'
+'    <button type="button" class="btn btn-red" id="gp-stop">停止</button>'
+'  </div>'
+'  <button type="button" class="btn btn-blue" id="gp-exp" style="margin-bottom:4px">导出全部题目数据</button>'
+'  <button type="button" class="btn btn-purple" id="gp-ai1">AI评当前题</button>'
+'  <div class="section-title">运行日志</div>'
+'  <div class="log" id="gp-lg"></div>'
+'</div>';
    document.body.appendChild(P);

    var $log=document.getElementById('gp-lg'),$body=document.getElementById('gp-body'),$ai=document.getElementById('gp-ai'),$imp=document.getElementById('gp-imp');
    var mode='full',imported=[],exportDirHandle=null,exportDirName='';

    function setStatus(text,ok){
        var dot=document.getElementById('gp-dot'),txt=document.getElementById('gp-st-text');
        if(dot)dot.style.background=(ok===false)?'#f38ba8':'#a6e3a1';
        if(txt)txt.textContent=text;
    }

    function log(m,c){c=c||'i';var d=document.createElement('div');d.className=c;d.textContent='['+new Date().toLocaleTimeString()+'] '+m;$log.appendChild(d);$log.scrollTop=$log.scrollHeight;console.log('[互评] '+m)}
    function save(k,v){try{localStorage.setItem('gp44_'+k,typeof v==='string'?v:JSON.stringify(v))}catch(e){}}
    function load(k){try{return localStorage.getItem('gp44_'+k)}catch(e){return null}}
    function loadJ(k){try{var s=localStorage.getItem('gp44_'+k);return s?JSON.parse(s):null}catch(e){return null}}
    function del(k){try{localStorage.removeItem('gp44_'+k)}catch(e){}}
    function getSelText(id){var el=document.getElementById(id);return(el&&el.selectedIndex>=0)?el.options[el.selectedIndex].text:''}
    function getSelValue(id){var el=document.getElementById(id);return el?el.value:''}
    function getModel(){var v=document.getElementById('gp-mdl').value.trim();return v||load('gp-mdl')||'deepseek-chat'}
    function shouldSkip(){return document.getElementById('gp-skip').checked}

    function onProviderChange(){
        var idx=parseInt(getSelValue('gp-provider')),p=PROVIDERS[idx];if(!p)return;
        save('gp-provider',idx);
        document.getElementById('gp-url').value=p.url;
        var inp=document.getElementById('gp-mdl'),sel=document.getElementById('gp-mdl-sel');
        sel.innerHTML='';
        if(p.models.length){
            for(var i=0;i<p.models.length;i++){var o=document.createElement('option');o.value=p.models[i];o.textContent=p.models[i];sel.appendChild(o)}
            sel.style.display='block';inp.value=p.models[0];
            document.getElementById('gp-mdl-ht').textContent='点选列表或手动输入，也可点获取拉取最新';
        }else{sel.style.display='none';inp.value='';inp.placeholder='手动输入模型名称';document.getElementById('gp-mdl-ht').textContent='自定义供应商，填写URL和Key后点获取'}
        save('gp-mdl',inp.value);
    }

    async function fetchModels(){
        var url=document.getElementById('gp-url').value.trim(),key=document.getElementById('gp-key').value.trim();
        if(!url){log('请先选择供应商或填写URL','e');return}if(!key){log('请先填写API Key','e');return}
        var u=url.replace(/\/+$/,'')+'/models';log('获取模型列表...','i');document.getElementById('gp-mdl-ht').textContent='正在获取...';
        try{
            var r=await fetch(u,{method:'GET',headers:{'Authorization':'Bearer '+key}});
            if(!r.ok){log('获取失败: HTTP '+r.status,'e');document.getElementById('gp-mdl-ht').textContent='获取失败，用预设模型';return}
            var j=await r.json(),models=[];
            if(j.data&&Array.isArray(j.data)){for(var i=0;i<j.data.length;i++)if(j.data[i].id)models.push(j.data[i].id)}
            else if(Array.isArray(j)){for(var k=0;k<j.length;k++)if(typeof j[k]==='string')models.push(j[k]);else if(j[k].id)models.push(j[k].id)}
            if(!models.length){log('未找到模型','w');document.getElementById('gp-mdl-ht').textContent='未获取到，用预设模型';return}
            models.sort();var uq=[];for(var m=0;m<models.length;m++)if(uq.indexOf(models[m])<0)uq.push(models[m]);
            var sel=document.getElementById('gp-mdl-sel');sel.innerHTML='';
            for(var n=0;n<uq.length;n++){var o=document.createElement('option');o.value=uq[n];o.textContent=uq[n];sel.appendChild(o)}
            sel.style.display='block';
            var sv=load('gp-mdl'),inp=document.getElementById('gp-mdl');if(sv)inp.value=sv;else if(uq.length)inp.value=uq[0];
            document.getElementById('gp-mdl-ht').textContent='已获取 '+uq.length+' 个模型';log('获取成功: '+uq.length+' 个模型','o');
        }catch(e){log('获取异常: '+e.message,'e');document.getElementById('gp-mdl-ht').textContent='获取失败，用预设模型'}
    }

    function readPage(){
        var box=document.querySelector('.autoBR');if(!box)return null;
        var html=box.innerHTML,text=box.innerText||box.textContent;
        var qType='未知',tm=html.match(/(问答题|综合题|选择题|判断题|填空题)/);if(tm)qType=tm[1];
        var cl=box.cloneNode(true),tas=cl.querySelectorAll('textarea');for(var i=0;i<tas.length;i++)tas[i].remove();
        var qText=(cl.textContent||'').trim().replace(/\s+/g,' ').substring(0,2000);
        var refAns='',ta=box.querySelector('textarea');if(ta)refAns=(ta.value||ta.textContent||'').trim();
        var stuAns='',hasAns=false,se=document.getElementById('an__Page');if(se){stuAns=(se.value||se.textContent||'').trim();hasAns=stuAns.length>0}
        var noSubmit=text.indexOf('该学生未提交作业')>=0;
        var hasFile=!!(document.querySelector('#downfile')||document.querySelector('input[value*="下载"]'));
        if(!hasFile&&!noSubmit&&qType==='综合题')hasFile=true;
        var mainEl=document.querySelector('.main')||document.body;
        var pageText=mainEl.innerText||'';
        var alreadyGraded = pageText.indexOf('您评定的成绩') >= 0 || pageText.indexOf('评定时间') >= 0 || pageText.indexOf('评定成功') >= 0;
        if(!alreadyGraded){
            var gradeText=document.body.innerText||'';
            if(gradeText.indexOf('评定时间') >= 0 || gradeText.indexOf('您评定的成绩') >= 0 || gradeText.indexOf('评定成功') >= 0) alreadyGraded=true
        }
        if(!alreadyGraded){
            var submitted=loadJ('submitted')||{};
            var key=(getSelText('MainContent_dropTitleList')+'|||'+getSelText('MainContent_dropStudent'));
            if(submitted[key])alreadyGraded=true
        }
        return{qType:qType,qText:qText,refAns:refAns,stuAns:stuAns,hasAns:hasAns,hasFile:hasFile,noSubmit:noSubmit,alreadyGraded:alreadyGraded}
    }

    function setScore(s,c){
        var se=document.getElementById('MainContent_dropScore'),ce=document.getElementById('MainContent_txtRemark');
        if(se){se.value=String(s);se.dispatchEvent(new Event('change',{bubbles:true}))}
        if(ce){ce.value=c;ce.dispatchEvent(new Event('input',{bubbles:true}))}
    }

    function markSubmitted(){
        var submitted=loadJ('submitted')||{};
        var key=getSelText('MainContent_dropTitleList')+'|||'+getSelText('MainContent_dropStudent');
        submitted[key]=Date.now();
        save('submitted',submitted)
    }

    function clickSubmit(){
        var now=Date.now();
        var lastSubmit=load('lastSubmitTime');
        var cooldown=15500;
        if(lastSubmit&&(now-parseInt(lastSubmit))<cooldown){
            var waitSec=Math.ceil((cooldown-(now-parseInt(lastSubmit)))/1000);
            log('系统冷却中，等待 '+waitSec+' 秒...','w');
            setStatus('冷却: '+waitSec+'秒', false);
            setTimeout(clickSubmit,1000);return
        }
        save('lastSubmitTime',String(Date.now()));
        markSubmitted();
        var btn=document.getElementById('MainContent_btnScore');
        if(btn){log('[SUBMIT] 提交','o');btn.click()}
    }

    function downloadStudentFile(cb){
        var form=document.getElementById('ctl01');if(!form){log('找不到表单','e');cb(false);return}
        var fd=new FormData(form);fd.append('downfile','下载作业');log('下载文件...','i');
        fetch(form.action||location.href,{method:'POST',body:fd}).then(function(r){
            if(!r.ok){log('下载失败: HTTP '+r.status,'e');cb(false);return}
            return r.blob().then(function(blob){
                if(blob.size<100){log('文件太小','w');cb(false);return}
                var title=getSelText('MainContent_dropTitleList').replace(/[\t\/\\:*?"<>|]/g,'_');
                var student=getSelText('MainContent_dropStudent').replace(/[\t\/\\:*?"<>|]/g,'_');
                var ct=r.headers.get('Content-Type')||'',ext='.doc';
                if(ct.indexOf('pdf')>=0)ext='.pdf';else if(ct.indexOf('zip')>=0)ext='.zip';else if(ct.indexOf('rar')>=0)ext='.rar';
                var fn=title+'_'+student+ext;
                var u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=fn;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);
                log('已下载: '+fn+' ('+(blob.size/1024).toFixed(1)+'KB)','o');cb(true);
            })
        }).catch(function(e){log('下载异常: '+e.message,'e');cb(false)})
    }

    async function startTask(t){
        del('lastOp');
        if(t==='export'){
            if(window.showDirectoryPicker){try{log('请选择保存文件夹...','i');var h=await window.showDirectoryPicker({mode:'readwrite'});exportDirName='互评导出_'+new Date().toISOString().slice(0,19).replace(/[:\-T]/g,'');exportDirHandle=await h.getDirectoryHandle(exportDirName,{create:true});log('保存到: '+h.name+'/'+exportDirName,'o')            }catch(e){log('已取消','w');setStatus('已取消',false);return}}
            else log('浏览器不支持选文件夹，用默认下载','w')
        }
        var ts=document.getElementById('MainContent_dropTitleList'),ss=document.getElementById('MainContent_dropStudent');
        var st={task:t,tIdx:ts?ts.selectedIndex:0,sIdx:ss?ss.selectedIndex:0,phase:'work',data:[]};
        save('task',t);save('state',st);log('启动 ['+t+']','o');setStatus('运行中...',true);doStep()
    }

    function doStep(){
        var t=load('task'),s=loadJ('state');if(!t||!s)return;
        if(s.phase==='work'){
            var pg=readPage();if(!pg)return;
            if(pg.alreadyGraded&&shouldSkip()){
                log(getSelText('MainContent_dropStudent')+' 已评过，跳过','w');
                skipAdvance(s);return
            }
            if(t==='full')doFull(s);else if(t==='ai')doAI(s);else if(t==='export')doExport(s);else if(t==='import')doImport(s)
        }else if(s.phase==='advance')doAdvance(s)
    }

    function skipAdvance(s){
        var ts=document.getElementById('MainContent_dropTitleList'),ss=document.getElementById('MainContent_dropStudent');if(!ts||!ss)return;
        if(s.sIdx+1<ss.options.length){
            s.sIdx++;s.phase='work';save('state',s);
            ss.selectedIndex=s.sIdx;
            log('跳过 -> '+ss.options[s.sIdx].text,'w');
            __doPostBack('ctl00$MainContent$dropStudent','')
        }else if(s.tIdx+1<ts.options.length){
            s.tIdx++;s.sIdx=0;s.phase='work';save('state',s);
            ts.selectedIndex=s.tIdx;
            log('跳过 -> 下一题 '+ts.options[s.tIdx].text,'w');
            __doPostBack('ctl00$MainContent$dropTitleList','')
        }else{
            if(s.task==='export'&&s.data&&s.data.length)finishExport(s.data);
            del('task');del('state');log('全部完成!','o');setStatus('全部完成!',true)
        }
    }

    function waitAndRun(fn,s){fn(s)}

    function doFull(s){
        var pg=readPage();if(!pg)return;var stu=getSelText('MainContent_dropStudent');
        if(pg.alreadyGraded&&shouldSkip()){log(stu+' 已评过，跳过','w');s.phase='advance';save('state',s);doAdvance(s);return}
        waitAndRun(doFullSubmit,s)
    }
    function doFullSubmit(s){
        var pg=readPage();if(!pg)return;if(pg.alreadyGraded&&shouldSkip()){doAdvance(s);return}
        var stu=getSelText('MainContent_dropStudent');
        if(pg.noSubmit){setScore(0,'该学生未提交作业。');log(stu+' -> 0分','w')}else{setScore(100,'回答得很好，100分。');log(stu+' -> 100分','o')}
        s.phase='advance';save('state',s);clickSubmit()
    }

    function doAI(s){
        var pg=readPage();if(!pg)return;var stu=getSelText('MainContent_dropStudent');
        if(pg.alreadyGraded&&shouldSkip()){log(stu+' 已评过，跳过','w');s.phase='advance';save('state',s);doAdvance(s);return}
        if(pg.noSubmit){setScore(0,'该学生未提交作业。');s.phase='advance';save('state',s);clickSubmit();return}
        if(pg.qType==='综合题'&&pg.hasFile&&!pg.hasAns){s.phase='advance';save('state',s);doAdvance(s);return}
        if(!pg.hasAns){setScore(0,'未提交答案。');s.phase='advance';save('state',s);clickSubmit();return}
        doAICall(s)
    }

    function doAICall(s){
        var pg=readPage();if(!pg)return;if(pg.alreadyGraded&&shouldSkip()){doAdvance(s);return}
        var stu=getSelText('MainContent_dropStudent');
        var url=document.getElementById('gp-url').value.trim(),key=document.getElementById('gp-key').value.trim(),mdl=getModel();
        if(!key){log('请填写API Key','e');return}
        log('AI评分: '+stu+' ['+mdl+']...','i');
        callAI(url,key,mdl,AI_PROMPT,pg).then(function(r){
            if(r){setScore(r.score,r.comment);log('-> '+r.score+'分','o');s.phase='advance';save('state',s);clickSubmit()}
            else{log('AI打分失败，已停止任务，请查看日志排查。','e');setStatus('AI错误，已停止',false);del('task');del('state')}
        })
    }

    function doExport(s){
        var pg=readPage();if(!pg)return;
        if(pg.alreadyGraded&&shouldSkip()){log(getSelText('MainContent_dropStudent')+' 已评过，跳过','w');s.phase='advance';save('state',s);doAdvance(s);return}
        s.data=s.data||[];
        s.data.push({title:getSelText('MainContent_dropTitleList'),student:getSelText('MainContent_dropStudent'),qType:pg.qType,qText:pg.qText,refAns:pg.refAns,stuAns:pg.stuAns,hasAns:pg.hasAns,noSubmit:pg.noSubmit,hasFile:pg.hasFile});
        save('state',s);log('导出: '+getSelText('MainContent_dropStudent'),'i');setStatus('导出中 '+s.data.length+'条',true);
        if(pg.qType==='综合题'&&pg.hasFile&&!pg.noSubmit){downloadStudentFile(function(){s.phase='advance';save('state',s);doAdvance(s)})}
        else{s.phase='advance';save('state',s);doAdvance(s)}
    }

    function doImport(s){
        if(!imported.length){log('请先导入','e');del('task');del('state');return}
        var title=getSelText('MainContent_dropTitleList'),student=getSelText('MainContent_dropStudent'),pg=readPage();
        if(pg&&pg.alreadyGraded&&shouldSkip()){log(student+' 已评过，跳过','w');s.phase='advance';save('state',s);doAdvance(s);return}
        var matched=null;
        for(var i=0;i<imported.length;i++){var d=imported[i];if((d.title&&d.student&&d.title===title&&d.student===student)||(d.id&&!d.title&&!d.student)){matched=d;break}}
        if(!matched&&imported[0]&&imported[0].id&&!imported[0].title){if(!s._idx)s._idx=0;if(pg&&pg.hasAns&&!pg.noSubmit){if(s._idx<imported.length){matched=imported[s._idx];s._idx++}}}
        if(matched){setScore(matched.score,matched.comment);log(student+': '+matched.score+'分','o')}
        save('state',s);s.phase='advance';save('state',s);
        if(matched)clickSubmit();else doAdvance(s)
    }

    async function callAI(bUrl,bKey,model,prompt,data){
        var u=bUrl.replace(/\/+$/,'')+'/chat/completions',msg='题目：'+data.qText+'\n\n参考答案：'+(data.refAns||'无')+'\n\n学生回答：'+(data.stuAns||'无');
        try{
            var ctrl=new AbortController(),tmr=setTimeout(function(){ctrl.abort()},60000);
            var r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+bKey},body:JSON.stringify({model:model,messages:[{role:'system',content:prompt},{role:'user',content:msg}],temperature:0.3,max_tokens:5000}),signal:ctrl.signal});
            clearTimeout(tmr);
            if(!r.ok){log('API错误:'+r.status,'e');return null}

            var j=await r.json();
            var reply = '';

            if(j.choices && j.choices.length > 0 && j.choices[0].message){
                reply = j.choices[0].message.content || '';
            } else if (j.response) {
                reply = j.response;
            } else if (j.data && j.data.response) {
                reply = j.data.response;
            }

            if(!reply || reply.trim() === '') {
                log('AI未返回有效内容！服务器回包：\n' + JSON.stringify(j), 'e');
                return null;
            }

            reply=reply.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim();

            var score = -1;
            var comment = "回答正确。";

            try {
                var p = JSON.parse(reply);
                if (p.score !== undefined) {
                    score = parseInt(p.score);
                    comment = p.comment || comment;
                }
            } catch(e) {
                var nm = reply.match(/"?score"?\s*[:：]\s*(\d+)/i) || reply.match(/分数\s*[:：]\s*(\d+)/i) || reply.match(/^(\d{1,3})$/);
                var cm = reply.match(/"?comment"?\s*[:：]\s*"([^"]+)"/i) || reply.match(/评语\s*[:：]\s*"([^"]+)"/i);
                if(nm) {
                    score = parseInt(nm[1]);
                    if(cm) comment = cm[1];
                }
            }

            if (score >= 0 && score <= 100) {
                return {score: score, comment: String(comment).substring(0,50)};
            } else {
                log('解析失败！AI返回：\n' + reply, 'e');
                return null;
            }
        }catch(e){
            log('API调用异常:'+e.message,'e');
            return null;
        }
    }

    function doAdvance(s){
        var ts=document.getElementById('MainContent_dropTitleList'),ss=document.getElementById('MainContent_dropStudent');if(!ts||!ss)return;
        if(s.sIdx+1<ss.options.length){s.sIdx++;s.phase='work';save('state',s);ss.selectedIndex=s.sIdx;ss.dispatchEvent(new Event('change',{bubbles:true}))}
        else if(s.tIdx+1<ts.options.length){s.tIdx++;s.sIdx=0;s.phase='work';save('state',s);ts.selectedIndex=s.tIdx;ts.dispatchEvent(new Event('change',{bubbles:true}))}
        else{if(s.task==='export'&&s.data&&s.data.length)finishExport(s.data);del('task');del('state');del('lastOp');log('全部完成!','o');setStatus('全部完成!',true)}
    }

    async function finishExport(data){
        var gradable=[],skipped=[];
        for(var i=0;i<data.length;i++){var it=data[i];
            if(it.noSubmit)skipped.push(it.title+' '+it.student+'(未提交)');
            else if(it.qType==='综合题'&&it.hasFile&&!it.hasAns)skipped.push(it.title+' '+it.student+'(文件)');
            else if(!it.hasAns)skipped.push(it.title+' '+it.student+'(无答案)');
            else gradable.push(it)}
        var gArr=[];for(var g=0;g<gradable.length;g++)gArr.push({id:g+1,title:gradable[g].title,student:gradable[g].student,question:gradable[g].qText,ref_answer:gradable[g].refAns,stu_answer:gradable[g].stuAns});
        var prompt='你是大学操作系统课程的作业评分助教。请根据参考答案对学生回答进行评分。\n\n评分标准（满分100分）：\n- 核心思路正确、关键步骤完整 → 90-100\n- 思路基本正确但有小错误或不够详细 → 70-89\n- 思路部分正确、有明显错误 → 50-69\n- 大部分错误或过于简略 → 30-49\n- 完全错误或未回答 → 0-29\n- 学生答案比参考答案更详细更准确，可以给满分\n- 只有结论没有过程，适当扣分\n\n评语要求：简要指出优点和不足，50字以内，中文。\n\n请严格按照以下JSON数组格式返回，不要返回其他任何内容：\n[{"id":1,"score":85,"comment":"评语"},...]\n\n以下是待评分的作业数据：\n\n'+JSON.stringify(gArr,null,2);
        var jsonStr=JSON.stringify(data,null,2);
        var dl=function(n,c,t){var b=new Blob([c],{type:t}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=n;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u)};
        async function wf(name,content,type){if(!exportDirHandle)return false;try{var fh=await exportDirHandle.getFileHandle(name,{create:true}),w=await fh.createWritable();await w.write(new Blob([content],{type:type}));await w.close();return true}catch(e){return false}}
        if(exportDirHandle){await wf('互评数据.json',jsonStr,'application/json');await wf('发给AI评分.txt',prompt,'text/plain')}
        else{dl('互评数据.json',jsonStr,'application/json');dl('发给AI评分.txt',prompt,'text/plain')}

        var box=document.getElementById('gp-copy-box');
        if(!box){box=document.createElement('div');box.id='gp-copy-box';box.className='copy-box';var gb=document.getElementById('gp-body'),lg=document.getElementById('gp-lg');gb.insertBefore(box,lg)}
        box.innerHTML=''
+'<div class="success"><h4>导出完成! 共 '+data.length+' 条 (可评 '+gradable.length+' 条)</h4>'
+'<ol><li>点下方 <b>[复制Prompt]</b> 按钮</li>'
+'<li>打开任意AI（ChatGPT/DeepSeek/通义等）</li>'
+'<li>粘贴发送，AI返回评分JSON</li>'
+'<li>回到本脚本选 <b>[导入评分结果]</b></li>'
+'<li>粘贴AI返回的JSON → 点开始</li></ol></div>'
+'<button type="button" class="btn btn-green" id="gp-copy-btn" style="font-size:15px;padding:14px">复制Prompt到剪贴板</button>'
+'<button type="button" class="btn btn-blue" id="gp-toggle-text" style="margin-top:4px;font-size:11px;padding:8px">展开/收起 Prompt 原文</button>'
+'<textarea id="gp-copy-ta" style="width:100%;height:0px;font-size:11px;font-family:Consolas,monospace;background:#11111b;color:#a6e3a1;border:1px solid #313244;border-radius:8px;padding:8px;resize:vertical;overflow:hidden;transition:height .2s;margin-top:4px">'+prompt.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</textarea>';

        document.getElementById('gp-copy-btn').onclick=function(e){
            e.preventDefault();var ta=document.getElementById('gp-copy-ta');ta.select();
            navigator.clipboard.writeText(ta.value).then(function(){
                document.getElementById('gp-copy-btn').textContent='已复制! 去粘贴给AI吧';document.getElementById('gp-copy-btn').className='btn btn-purple';
                log('已复制到剪贴板!','o');
                setTimeout(function(){document.getElementById('gp-copy-btn').textContent='复制Prompt到剪贴板';document.getElementById('gp-copy-btn').className='btn btn-green'},3000)
            }).catch(function(){ta.style.height='200px';ta.select();log('自动复制失败，请手动Ctrl+C','w')})
        };
        document.getElementById('gp-toggle-text').onclick=function(e){
            e.preventDefault();var ta=document.getElementById('gp-copy-ta');
            ta.style.height=(ta.style.height==='0px'||ta.style.height==='')?'250px':'0px';ta.style.overflow=(ta.style.height==='0px')?'hidden':'auto'
        };
        log('====================','o');log('导出完成! 共 '+data.length+' 条','o');log('可评分: '+gradable.length+' | 跳过: '+skipped.length,'o');
        if(exportDirHandle)log('文件已保存到: '+exportDirName+'/','o');else log('文件已下载','o');
        log('↑ 点绿色按钮复制Prompt给AI','o');log('====================','o');setStatus('完成! 复制Prompt给AI',true)
    }

    async function checkResume(){var t=load('task'),s=loadJ('state');if(!t||!s)return;log('恢复任务: '+t,'w');setStatus('恢复运行...',true);mode=t;
    var btns=document.querySelectorAll('#gp-modes .m');for(var i=0;i<btns.length;i++)btns[i].classList.toggle('on',btns[i].getAttribute('data-m')===mode);
    $ai.style.display=(mode==='ai')?'block':'none';$imp.style.display=(mode==='import')?'block':'none';setTimeout(doStep,800)}

    document.getElementById('gp-min').onclick=function(e){e.preventDefault();$body.style.display=($body.style.display==='none')?'block':'none'};
    var modeBtns=document.querySelectorAll('#gp-modes .m');
    for(var i=0;i<modeBtns.length;i++){(function(btn){btn.onclick=function(e){
        e.preventDefault();for(var j=0;j<modeBtns.length;j++)modeBtns[j].classList.remove('on');btn.classList.add('on');mode=btn.getAttribute('data-m');
        $ai.style.display=(mode==='ai')?'block':'none';$imp.style.display=(mode==='import')?'block':'none';
        var go=document.getElementById('gp-go');go.textContent=(mode==='export')?'开始导出':'开始';go.className='btn '+(mode==='export'?'btn-blue':'btn-green');
        var h=document.getElementById('gp-mode-hint');
        var hints={full:'<b style="color:#a6e3a1">默认满分：</b>所有学生直接打100分，自动遍历',ai:'<b style="color:#cba6f7">AI自动评分：</b>选供应商→填Key→获取模型→开始，每15秒一题',export:'<b style="color:#89b4fa">导出流程：</b>开始→遍历→完成后复制Prompt给AI→AI返回JSON→导入',import:'<b style="color:#f5c2e7">导入流程：</b>粘贴AI返回的JSON→点导入→开始自动填入'};
        h.innerHTML=hints[mode]||''}})(modeBtns[i])}

    document.getElementById('gp-go').onclick=function(e){e.preventDefault();startTask(mode)};
    document.getElementById('gp-stop').onclick=function(e){e.preventDefault();del('task');del('state');exportDirHandle=null;log('已停止','w');setStatus('已停止',false)};
    document.getElementById('gp-exp').onclick=function(e){e.preventDefault();startTask('export')};
    document.getElementById('gp-provider').onchange=function(e){e.preventDefault();onProviderChange()};
    document.getElementById('gp-fetch').onclick=function(e){e.preventDefault();fetchModels()};
    document.getElementById('gp-mdl').oninput=function(){save('gp-mdl',this.value)};
    document.getElementById('gp-mdl-sel').onclick=function(e){e.preventDefault();if(this.value){document.getElementById('gp-mdl').value=this.value;save('gp-mdl',this.value)}};
    document.getElementById('gp-mdl-sel').onchange=function(){if(this.value){document.getElementById('gp-mdl').value=this.value;save('gp-mdl',this.value)}};

    document.getElementById('gp-ai1').onclick=function(e){e.preventDefault();var pg=readPage();if(!pg)return;var url=document.getElementById('gp-url').value.trim(),key=document.getElementById('gp-key').value.trim(),mdl=getModel();
    if(!key){log('请填写API Key','e');return}log('AI评当前题 ['+mdl+']...','i');callAI(url,key,mdl,AI_PROMPT,pg).then(function(r){if(r){setScore(r.score,r.comment);log('-> '+r.score+'分','o')}else log('AI失败','e')})};

    document.getElementById('gp-file').onchange=function(e){var f=e.target.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(ev){try{imported=JSON.parse(ev.target.result);log('导入成功: '+imported.length+'条','o')}catch(e){log('JSON格式错误','e')}};rd.readAsText(f)};
    document.getElementById('gp-paste-btn').onclick=function(e){e.preventDefault();var t=document.getElementById('gp-paste').value.trim();if(!t){log('请先粘贴JSON','e');return}
    try{imported=JSON.parse(t);log('粘贴导入: '+imported.length+'条','o');document.getElementById('gp-paste-btn').textContent='已导入 '+imported.length+' 条!';setTimeout(function(){document.getElementById('gp-paste-btn').textContent='导入粘贴的评分'},2000)}catch(e){log('JSON格式错误','e')}};

    var skipEl=document.getElementById('gp-skip');
    skipEl.onchange=function(){save('gp-skip',this.checked?'1':'0')};
    var savedSkip=load('gp-skip');
    skipEl.checked=(savedSkip!=='0');

    document.getElementById('gp-url').onchange=function(){save('gp-url',this.value)};

    var savedUrl = load('gp-url');
    var savedMdl = load('gp-mdl');

    var sp=load('gp-provider');
    if(sp!==null){
        document.getElementById('gp-provider').value=sp;
        onProviderChange();
    } else {
        onProviderChange();
    }

    if(savedUrl) { document.getElementById('gp-url').value = savedUrl; save('gp-url', savedUrl); }
    if(savedMdl) { document.getElementById('gp-mdl').value = savedMdl; save('gp-mdl', savedMdl); }

    var sk=load('gp-key');if(sk)document.getElementById('gp-key').value=sk;
    document.getElementById('gp-key').onchange=function(){save('gp-key',this.value)};

    // 清除API Key按钮
    document.getElementById('gp-clear-key').onclick=function(e){
        e.preventDefault();
        del('gp-key');
        document.getElementById('gp-key').value='';
        log('API Key已清除','o');
    };

    // 隐私提示
    if(!load('privacy_acknowledged')){
        var ack=confirm('隐私提示：\n\nAI评分模式会将【题目、参考答案、学生回答】发送到你选择的AI供应商服务器。\n\n请确认你了解此风险后继续使用。\n\n点击"确定"不再提示，点"取消"暂不使用AI功能。');
        if(ack)save('privacy_acknowledged','1');
    }

    log('脚本已加载 v6.0','o');checkResume();

    }catch(err){console.error('[互评脚本] 错误:',err);alert('[互评脚本] 出错: '+err.message)}
})();
