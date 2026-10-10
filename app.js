const morning=['601','602','603','604','701','702','703','704','801','802','803','804','901','902','903','904','1001','1002','1003','1101','1102'];
const afternoon=['605','606','607','608','609','705','706','707','708','805','806','807','808','905','906','907','1004','1005','1006','1103','1104'];
const KEY='ecopunto_profiles_v1', SYNC_KEY='ecopunto_sync_queue'; let stream=null; let current=null;
const profileSyncs=new Map();
const $=s=>document.querySelector(s); const screens=[...document.querySelectorAll('.screen')];
let profilesReturnScreen='studentAccess',actionDialogResolve=null;
document.body.classList.toggle('home-active',$('.screen.active')?.id==='home');
const loadingSplash=$('#loadingSplash');
if(loadingSplash){
  let splashTimer=null, splashDismissed=false;
  const dismissSplash=()=>{
    if(splashTimer||splashDismissed)return;
    splashTimer=setTimeout(()=>{
      splashDismissed=true;
      loadingSplash.classList.add('is-leaving');
      setTimeout(()=>{loadingSplash.hidden=true;},600);
    },900);
  };
  window.addEventListener('load',dismissSplash,{once:true});
  setTimeout(dismissSplash,3000);
}
const ecoLion=$('#ecoLion');
let lionAttentionTimer=null,lionTalkTimer=null,lionBlinkTimer=null,lastLionTarget=null;
const lionSpeech=$('.lion-speech');
const lionEyes=$('.lion-eyes');
const lionFrames=Array.from({length:48},(_,index)=>`imagenes/leo-natural-${String(index).padStart(2,'0')}.png`);
function updateLionGaze(x,y){
  if(!lionEyes||!Number.isFinite(x)||!Number.isFinite(y))return;
  const bounds=lionEyes.getBoundingClientRect();
  if(!bounds.width||!bounds.height)return;
  const gazeX=Math.max(-1,Math.min(1,(x-(bounds.left+bounds.width/2))/(bounds.width*.48)));
  const gazeY=Math.max(-1,Math.min(1,(y-(bounds.top+bounds.height/2))/(bounds.height*.45)));
  lionEyes.style.setProperty('--gaze-x',`${(gazeX*24).toFixed(1)}%`);
  lionEyes.style.setProperty('--gaze-y',`${(gazeY*20).toFixed(1)}%`);
}
function startLionAnimation(){
  if(!ecoLion)return;
  const current=$('.lion-motion-current'),next=$('.lion-motion-next');
  if(!current||!next)return;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let startedAt=null,lastFrame=-1,finished=false;
  const showFinalFrame=()=>{
    current.src=lionFrames[lionFrames.length-1];
    current.style.opacity='1';
    next.style.opacity='0';
    finished=true;
  };
  lionFrames.forEach(src=>{const image=new Image();image.src=src;});
  if(reducedMotion.matches){showFinalFrame();return;}
  const animate=now=>{
    if(finished)return;
    if(reducedMotion.matches){showFinalFrame();return;}
    if(startedAt===null)startedAt=now;
    const progress=Math.min((now-startedAt)/4000,1);
    const framePosition=progress*(lionFrames.length-1);
    const frameIndex=Math.floor(framePosition);
    if(frameIndex!==lastFrame){
      current.src=lionFrames[frameIndex];
      next.src=lionFrames[Math.min(frameIndex+1,lionFrames.length-1)];
      lastFrame=frameIndex;
    }
    const blend=progress===1?0:framePosition-frameIndex;
    current.style.opacity=String(1-blend);
    next.style.opacity=String(blend);
    if(progress===1)showFinalFrame();
    else requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}
function lionPhrase(target){
  const control=target?.closest?.('button,a,input,select,textarea,label,[role="button"]');
  if(!control)return '¡Hola! Soy Leo. Vamos a cuidar el planeta.';
  const id=control.id;
  const role=control.dataset?.role;
  const phrases={
    student:'¡Vamos! Escanea residuos y gana puntos.',
    teacher:'¡Hola, profe! Aquí puedes consultar los puntos.',
    game:'¡Pronto tendremos juegos ecológicos!',
    createAccount:'¡Creemos tu cuenta para guardar tus puntos!',
    loginAccount:'¡Entra a tu cuenta y recupera tus puntos!',
    useLocalProfile:'¡Elige el perfil que ya está en este dispositivo!',
    loginExistingAccount:'¡Busca tu cuenta para seguir sumando!',
    studentPassword:'Tu contraseña es privada; escríbela con tranquilidad.',
    loginStudentPassword:'Tu contraseña es privada y está segura.',
    names:'¡Cuéntame tus nombres!',
    surnames:'Ahora escribe tus apellidos.',
    shift:'Elige tu jornada escolar.',
    grade:'Selecciona tu grado.',
    saveProfile:'Cuando termines, pulsa aquí para continuar.',
    submitAccountLogin:'Pulsa aquí para entrar a tu cuenta.',
    addProfile:'¿Otra persona va a reciclar? Agrega su perfil.',
    scanButton:'¡A buscar un residuo para reciclar!',
    capture:'Apunta la cámara al residuo y captúralo.',
    deleteLocalAccount:'Puedes quitar este perfil de este dispositivo.',
    installAppButton:'¡Instala EcoPunto para tenerlo a mano!'
  };
  if(id&&phrases[id])return phrases[id];
  if(role==='student')return phrases.student;
  if(role==='teacher')return phrases.teacher;
  if(control.matches('input[type="password"]'))return 'Tu contraseña es privada y está segura.';
  if(control.matches('select'))return control.id==='shift'?phrases.shift:phrases.grade;
  if(control.matches('.back,[data-go]'))return 'Si quieres, volvemos a la pantalla anterior.';
  if(control.matches('h1'))return '¡Bienvenido a EcoPunto! Separa, aprende y suma.';
  if(control.matches('h2,h3'))return `¡Mira! ${control.textContent.trim()}`;
  if(control.matches('.tip'))return 'Cada residuo bien separado ayuda a cuidar nuestro planeta.';
  if(control.matches('.stats > div'))return `¡Buen trabajo! ${control.innerText.replace(/\s+/g,' ').trim()}`;
  const text=(control.getAttribute('aria-label')||control.innerText||control.value||'').replace(/\s+/g,' ').trim();
  return text?`¡Vamos! ${text.slice(0,58)}${text.length>58?'…':''}`:'¡Estoy aquí para ayudarte!';
}
function speakWithLion(target,attentive=true){
  if(!ecoLion||!lionSpeech)return;
  const phrase=lionPhrase(target);
  if(lionSpeech.textContent!==phrase)lionSpeech.textContent=phrase;
  if(attentive){
    ecoLion.classList.add('is-attentive','is-talking');
    clearTimeout(lionAttentionTimer);
    clearTimeout(lionTalkTimer);
    lionAttentionTimer=setTimeout(()=>ecoLion.classList.remove('is-attentive'),2600);
    lionTalkTimer=setTimeout(()=>ecoLion.classList.remove('is-talking'),1700);
  }
}
function updateLionSpeech(){
  if(!ecoLion)return;
  const active=document.activeElement;
  const passwordFocused=active?.matches?.('input[type="password"]')&&active.getClientRects().length>0;
  const teacherPasswordOpen=$('#teacherPasswordModal')&&!$('#teacherPasswordModal').hidden;
  ecoLion.classList.toggle('eyes-closed',Boolean(passwordFocused||teacherPasswordOpen));
  if(passwordFocused)speakWithLion(active);
  else if(teacherPasswordOpen)speakWithLion($('#teacherPasswordInput'));
}
if(ecoLion){
  startLionAnimation();
  lionSpeech.textContent='¡Hola! Soy Leo. Vamos a cuidar el planeta.';
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    const scheduleBlink=()=>{
      lionBlinkTimer=setTimeout(()=>{
        if(!document.hidden&&!ecoLion.classList.contains('eyes-closed')){
          ecoLion.classList.add('is-blinking');
          setTimeout(()=>ecoLion.classList.remove('is-blinking'),320);
        }
        scheduleBlink();
      },4500+Math.random()*3000);
    };
    scheduleBlink();
  }
  document.addEventListener('pointermove',event=>{
    if(event.pointerType==='mouse'){
      updateLionGaze(event.clientX,event.clientY);
      const target=document.elementFromPoint(event.clientX,event.clientY);
      const control=target?.closest?.('button,a,input,select,textarea,label,[role="button"],h1,h2,h3,.tip,.stats > div,.welcome');
      if(control&&control!==lastLionTarget){lastLionTarget=control;speakWithLion(control);}
    }
  },{passive:true});
  document.addEventListener('pointerdown',event=>{
    updateLionGaze(event.clientX,event.clientY);
    const control=event.target.closest?.('button,a,input,select,textarea,label,[role="button"],h1,h2,h3,.tip,.stats > div,.welcome');
    if(control){lastLionTarget=control;speakWithLion(control);}
  },{passive:true});
  document.addEventListener('focusin',event=>{
    if(event.target===ecoLion||ecoLion.contains(event.target))return;
    lastLionTarget=event.target;
    const bounds=event.target.getBoundingClientRect();
    updateLionGaze(bounds.left+bounds.width/2,bounds.top+bounds.height/2);
    speakWithLion(event.target);
    updateLionSpeech();
  });
  document.addEventListener('focusout',()=>setTimeout(updateLionSpeech,0));
  const passwordModal=$('#teacherPasswordModal');
  if(passwordModal)new MutationObserver(updateLionSpeech).observe(passwordModal,{attributes:true,attributeFilter:['hidden']});
}
function go(id){
  const previous=document.querySelector('.screen.active')?.id;
  if(previous==='scanner'&&id!=='scanner'&&stream){
    stream.getTracks().forEach(track=>track.stop());
    stream=null;
    $('#camera').srcObject=null;
  }
  screens.forEach(x=>x.classList.toggle('active',x.id===id));
  document.body.classList.toggle('home-active',id==='home');
  if(id==='home')updateHomeProfileButton();
  if(id==='home'&&ecoLion&&lionSpeech){
    lionSpeech.textContent='¡Hola! Soy Leo. Vamos a cuidar el planeta.';
    ecoLion.classList.remove('is-attentive','is-talking');
  }
  updateLionSpeech();
  if(id==='studentAccess')renderStudentAccess();
  if(id==='dashboard')renderDashboard();
  if(id==='profiles')renderProfiles();
  if(id==='myProfile')renderMyProfile();
  if(id==='teacher')renderTeacher();
}
function profiles(){return JSON.parse(localStorage.getItem(KEY)||'[]')}
function saveProfiles(p){localStorage.setItem(KEY,JSON.stringify(p))}
function showProfile(p){current=p; localStorage.setItem('ecopunto_current',p.id); updateHomeProfileButton(); go('dashboard')}
function showActionDialog(message,{title='EcoPunto',confirm=false}={}){
  const dialog=$('#actionDialog'),cancel=$('#actionDialogCancel'),accept=$('#actionDialogConfirm');
  $('#actionDialogTitle').textContent=title;
  $('#actionDialogMessage').textContent=message;
  cancel.hidden=!confirm;
  accept.textContent=confirm?'Quitar':'Aceptar';
  dialog.hidden=false;
  return new Promise(resolve=>{
    actionDialogResolve=resolve;
    (confirm?cancel:accept).focus({preventScroll:true});
  });
}
function closeActionDialog(accepted){
  const dialog=$('#actionDialog');
  if(dialog.hidden)return;
  dialog.hidden=true;
  const resolve=actionDialogResolve;
  actionDialogResolve=null;
  resolve?.(accepted);
}
$('#actionDialogCancel').onclick=()=>closeActionDialog(false);
$('#actionDialogConfirm').onclick=()=>closeActionDialog(true);
function updateHomeProfileButton(){
  const button=$('#homeProfileButton');
  if(button)button.hidden=!current||!profiles().some(profile=>profile.id===current.id);
}
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{
  if(b.dataset.role==='student') go('studentAccess');
  else openTeacherPassword();
});
$('#createAccount').onclick=()=>go('register');
$('#loginAccount').onclick=()=>go('accountLogin');
$('#loginExistingAccount').onclick=()=>go('accountLogin');
$('#useLocalProfile').onclick=()=>go('profiles');
$('#addProfile').onclick=()=>go('register');
$('#homeProfileButton').onclick=()=>go('myProfile');
$('#dashboardProfileButton').onclick=()=>go('myProfile');
$('#switchProfileButton').onclick=()=>{profilesReturnScreen='myProfile';go('profiles')};
$('#profileListBack').onclick=()=>go(profilesReturnScreen);
$('#profileMenuDeleteButton').onclick=()=>{if(current)removeLocalProfile(current.id)};
async function accountRequest(action,payload={},session=null,retry=true){
  const headers={'Content-Type':'application/json'};
  if(session?.accessToken)headers.Authorization=`Bearer ${session.accessToken}`;
  let response;
  try{
    response=await fetch('/api/account',{method:'POST',headers,body:JSON.stringify({action,...payload})});
  }catch(error){
    throw new Error('No se pudo conectar con el servicio de cuentas. Si estás probando en tu computadora, inicia la app con Vercel CLI o publícala en Vercel; Live Server no ejecuta /api.');
  }
  const data=await response.json().catch(()=>({}));
  if(response.status===401&&session?.refreshToken&&retry){
    const refreshed=await accountRequest('refresh',{refreshToken:session.refreshToken});
    session.accessToken=refreshed.accessToken;session.refreshToken=refreshed.refreshToken;
    persistSession(session);
    return accountRequest(action,payload,session,false);
  }
  if(!response.ok)throw new Error(data.error||(response.status===404?'No se encontró /api/account. Live Server no ejecuta las funciones de Vercel; usa Vercel CLI o publica la app en Vercel.':'No se pudo completar la operación con la cuenta.'));
  return data;
}
function persistSession(session){
  const all=profiles(),index=all.findIndex(p=>p.id===session.id);
  if(index>=0){all[index].accessToken=session.accessToken;all[index].refreshToken=session.refreshToken;saveProfiles(all);}
}
function localProfileFromCloud(data,previous=null){
  const cloud=data.profile,old=profiles().find(p=>p.id===cloud.id)||previous;
  return {
    id:cloud.id,accountId:cloud.id,accountCode:cloud.student_code,email:cloud.email,names:cloud.names,surnames:cloud.surnames,
    grade:cloud.grade,shift:cloud.shift,points:cloud.points,scans:cloud.scans,history:old?.history||[],
    accessToken:data.accessToken||old?.accessToken,refreshToken:data.refreshToken||old?.refreshToken,cloudAccount:true
  };
}
function saveCloudProfile(profile){
  const all=profiles(),index=all.findIndex(p=>p.id===profile.id);
  if(index>=0)all[index]=profile;else all.push(profile);
  saveProfiles(all);
}
function renderStudentAccess(){$('#useLocalProfile').hidden=profiles().length===0}
$('#saveProfile').onclick=async()=>{
  const password=$('#studentPassword').value;
  const fields={names:$('#names').value.trim(),surnames:$('#surnames').value.trim(),email:$('#studentEmail').value.trim().toLowerCase(),shift:$('#shift').value,grade:$('#grade').value};
  if(!password){await showActionDialog('Escribe una contraseña de al menos 8 caracteres.');$('#studentPassword').focus();return}
  if(password.length<8){await showActionDialog('La contraseña debe tener al menos 8 caracteres.');$('#studentPassword').focus();return}
  if(!fields.names||!fields.surnames||!fields.email||!fields.shift||!fields.grade){await showActionDialog('Completa el nombre, apellido, correo, jornada y grado.');return}
  if(!$('#studentEmail').validity.valid){await showActionDialog('Escribe un correo electrónico válido.');$('#studentEmail').focus();return}
  const button=$('#saveProfile');button.disabled=true;
  try{
    const data=await accountRequest('register',{...fields,password});
    if(!data.emailNoticeSent)await showActionDialog(data.notice||'La cuenta se creó, pero no se pudo enviar el mensaje al correo. Contacta al administrador.');
    const profile=localProfileFromCloud(data);saveCloudProfile(profile);showProfile(profile);
  }catch(error){await showActionDialog(error.message,{title:'No se pudo crear la cuenta'});}
  finally{button.disabled=false;}
};
$('#submitAccountLogin').onclick=async()=>{
  const email=$('#loginEmail').value.trim().toLowerCase(),password=$('#loginStudentPassword').value,status=$('#accountStatus');
  if(!email){status.textContent='Escribe el correo de tu cuenta.';$('#loginEmail').focus();return}
  if(!$('#loginEmail').validity.valid){status.textContent='Escribe un correo electrónico válido.';$('#loginEmail').focus();return}
  if(!password){status.textContent='Escribe tu contraseña.';$('#loginStudentPassword').focus();return}
  const button=$('#submitAccountLogin');button.disabled=true;status.textContent='Conectando con la cuenta…';
  try{
    const data=await accountRequest('login',{email,password});
    const profile=localProfileFromCloud(data);saveCloudProfile(profile);status.textContent='Cuenta sincronizada.';showProfile(profile);
  }catch(error){status.textContent=error.message;}
  finally{button.disabled=false;}
};
$('#legacyLoginToggle').onclick=()=>{
  const fields=$('#legacyLoginFields');
  fields.hidden=!fields.hidden;
  if(!fields.hidden)$('#loginStudentCode').focus();
};
$('#submitLegacyAccountLogin').onclick=async()=>{
  const studentCode=$('#loginStudentCode').value.trim(),password=$('#loginStudentPassword').value,status=$('#accountStatus');
  if(!studentCode||!password){status.textContent='Ingresa el código anterior y su contraseña.';return}
  const button=$('#submitLegacyAccountLogin');button.disabled=true;status.textContent='Conectando con la cuenta…';
  try{
    const data=await accountRequest('login',{studentCode,password});
    const profile=localProfileFromCloud(data);saveCloudProfile(profile);status.textContent='Cuenta sincronizada.';showProfile(profile);
  }catch(error){status.textContent=error.message;}
  finally{button.disabled=false;}
};

function openTeacherPassword(){
  const modal=$('#teacherPasswordModal'),input=$('#teacherPasswordInput');
  if(!modal||!input)return;
  modal.hidden=false; input.value='';
  if(gamepadState.connected){ input.readOnly=true; input.setAttribute('inputmode','none'); $('#teacherPasswordHint').textContent='🎮 A escribe · B cierra · X espacio · mantén Y para mostrar la clave · LT/RT borrar · Start entrar'; setKeyboardTarget(input); buildVirtualKeyboard(); modal.classList.add('using-gamepad'); }
  else { input.readOnly=false; input.setAttribute('inputmode','numeric'); $('#teacherPasswordHint').textContent='Escribe la clave y pulsa Entrar.'; modal.classList.remove('using-gamepad'); setTimeout(()=>input.focus(),50); }
  setTimeout(()=>input.focus({preventScroll:true}),0);
}
function closeTeacherPassword(){ $('#teacherPasswordModal')?.setAttribute('hidden',''); closeVirtualKeyboard(); }
async function submitTeacherPassword(){
  const input=$('#teacherPasswordInput');
  if(!input||!input.value)return;
  const button=$('#teacherPasswordEnter');
  button.disabled=true;
  try{
    const response=await fetch('/api/teacher-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:input.value})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'No se pudo validar la clave docente.');
    closeTeacherPassword();
    go('teacher');
  }catch(error){
    input.value='';
    updateKeyboardTarget();
    $('#teacherPasswordHint').textContent=error.message;
    input.focus({preventScroll:true});
  }finally{button.disabled=false;}
}
$('#teacherPasswordEnter')?.addEventListener('click',submitTeacherPassword); $('#closeTeacherPassword')?.addEventListener('click',closeTeacherPassword); $('#teacherPasswordInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submitTeacherPassword();}});

function updateGradeOptions(shiftId,gradeId){
  const shift=$(`#${shiftId}`).value,list=shift==='Mañana'?morning:shift==='Tarde'?afternoon:[];
  const grade=$(`#${gradeId}`);
  grade.disabled=!list.length;
  grade.innerHTML='<option value="">Selecciona tu grado</option>'+list.map(value=>`<option>${value}</option>`).join('');
}
$('#shift').onchange=()=>updateGradeOptions('shift','grade');
function renderProfiles(){
  const list=$('#profileList');list.replaceChildren();
  profiles().forEach(p=>{
    const row=document.createElement('div');row.className='profile-row';
    const select=document.createElement('button');select.type='button';select.className='choice';select.dataset.id=p.id;
    const name=document.createElement('b');name.textContent=`${p.names} ${p.surnames}`;
    const meta=document.createElement('small');meta.textContent=`${p.grade} · ${p.shift} · ⭐ ${p.points}${p.cloudAccount?' · Cuenta online':' · Solo en este dispositivo'}`;
    select.append(name,meta);
    const remove=document.createElement('button');remove.type='button';remove.className='secondary danger';remove.dataset.removeId=p.id;remove.textContent='Quitar de este dispositivo';
    row.append(select,remove);list.append(row);
  });
  $('#profileListBack').hidden=profiles().length===0&&profilesReturnScreen==='studentAccess';
  list.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{const p=profiles().find(x=>x.id===b.dataset.id);if(p)showProfile(p)});
  list.querySelectorAll('[data-remove-id]').forEach(b=>b.onclick=()=>removeLocalProfile(b.dataset.removeId));
}
function renderMyProfile(){
  const profile=current||profiles().find(item=>item.id===localStorage.getItem('ecopunto_current'));
  if(!profile){go('home');return}
  current=profile;
  $('#profileMenuName').textContent=`${profile.names} ${profile.surnames}`;
  $('#profileMenuMeta').textContent=`Grado ${profile.grade} · Jornada ${profile.shift}`;
  $('#profileMenuCode').textContent=profile.cloudAccount?'Cuenta online vinculada a tus datos y contraseña.':'Perfil guardado solo en este dispositivo';
  $('#profileMenuPoints').textContent=`⭐ ${profile.points}`;
  $('#profileMenuTotalPoints').textContent=profile.points;
  $('#profileMenuTotalScans').textContent=profile.scans;
  const history=$('#profileMenuHistory');
  history.replaceChildren();
  const entries=(profile.history||[]).slice(-5).reverse();
  if(!entries.length){
    const empty=document.createElement('p');empty.className='notice';empty.textContent='Todavía no hay escaneos guardados en este dispositivo.';history.append(empty);return;
  }
  entries.forEach(entry=>{
    const item=document.createElement('p');
    item.textContent=`${entry.residue||'Residuo'} · ${entry.bin||'—'} · +${entry.points||0} puntos`;
    history.append(item);
  });
}
function renderDashboard(){
  const p=current||profiles().find(x=>x.id===localStorage.getItem('ecopunto_current'));
  if(!p){go('home');return}
  current=p;$('#who').textContent=p.names+' '+p.surnames;$('#whoMeta').textContent=p.grade+' · Jornada '+p.shift;
  $('#pointsBadge').textContent='⭐ '+p.points;$('#totalPoints').textContent=p.points;$('#totalScans').textContent=p.scans;
  $('#accountSyncStatus').textContent=p.cloudAccount?'Cuenta online: los puntos se sincronizan cuando hay conexión.':'Perfil local: crea una cuenta online para conservar puntos entre dispositivos.';
  if(p.cloudAccount&&navigator.onLine)syncProfileQueue(p).catch(error=>{console.error('EcoPunto: no se pudo sincronizar la cuenta.',error);$('#accountSyncStatus').textContent=`Puntos pendientes de sincronizar: ${error.message}`;});
}
async function removeLocalProfile(id){
  const profile=profiles().find(p=>p.id===id);if(!profile)return;
  const warning=profile.cloudAccount
    ?'Se quitará el perfil solo de este dispositivo. La cuenta online y sus puntos se conservarán. Los escaneos pendientes deben sincronizarse antes de continuar.'
    :'Este perfil solo existe en este dispositivo. Al quitarlo, sus puntos e historial locales se perderán.';
  if(!await showActionDialog(warning,{title:'Quitar perfil',confirm:true}))return;
  const hasPending=JSON.parse(localStorage.getItem(SYNC_KEY)||'[]').some(item=>item.profileId===id);
  if(profile.cloudAccount&&hasPending){
    try{await syncProfileQueue(profile);}
    catch(error){await showActionDialog(`No se quitó el perfil porque no se pudieron confirmar los puntos en la cuenta online: ${error.message}`,{title:'No se quitó el perfil'});return;}
  }
  saveProfiles(profiles().filter(p=>p.id!==id));
  if(localStorage.getItem('ecopunto_current')===id){localStorage.removeItem('ecopunto_current');current=null;}
  const activeScreen=document.querySelector('.screen.active')?.id;
  if(activeScreen==='dashboard'||activeScreen==='myProfile')go('home');
  else renderProfiles();
}
$('#deleteLocalAccount').onclick=()=>{if(current)removeLocalProfile(current.id)};
$('#scanButton').onclick=async()=>{go('scanner');await startCamera()};
async function startCamera(){
  if(stream)stream.getTracks().forEach(t=>t.stop());
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    $('#camera').srcObject=stream;
    $('#cameraStatus').textContent='Cámara lista. Apunta al residuo.';
    $('#capture').disabled=false;
    prepareLocalClassifier();
  }catch(error){
    console.error('EcoPunto: no se pudo iniciar la cámara.',error);
    $('#cameraStatus').textContent='No se pudo acceder a la cámara. Revisa el permiso, usa HTTPS o conecta un dispositivo con cámara.';
    $('#capture').disabled=true;
  }
}
$('#capture').onclick=()=>captureResidue();

const RESIDUE_RULES={
  Botella_plastica:{name:'Botella plástica',bin:'Blanco',points:10,info:'Envase plástico aprovechable. Entrégalo limpio y seco.'},
  Lata:{name:'Lata',bin:'Blanco',points:10,info:'Envase metálico aprovechable. Entrégalo limpio y seco.'},
  Papel_carton:{name:'Papel o cartón',bin:'Blanco',points:10,info:'Papel o cartón aprovechable cuando está limpio y seco.'},
  Organico:{name:'Residuo orgánico',bin:'Verde',points:10,info:'Restos de comida y otros residuos orgánicos.'},
  No_aprovechable:{name:'No aprovechable',bin:'Negro',points:10,info:'Residuo que no se puede aprovechar mediante reciclaje convencional.'},
  Otro:{name:'No identificado',bin:'Ninguno',points:0,info:'No se identificó un residuo con suficiente seguridad.'}
};
function showScanResult(result,source){
  if(!result)return false;
  const rule=RESIDUE_RULES[result.className];
  if(!rule)return false;
  if(result.className==='Otro'){
    $('#scanResult').hidden=true;
    $('#cameraStatus').textContent='No se identificó un residuo con suficiente seguridad. No se asignaron puntos.';
    return false;
  }
  $('#scanResult').hidden=false; $('#scanResultName').textContent=rule.name;
  $('#scanResultInfo').textContent=(rule.info||'')+(source?` · Identificado por ${source}.`:'');
  $('#scanResultBin').textContent=rule.bin||'—'; $('#scanResultPoints').textContent=`+${Number(rule.points||0)}`;
  $('#cameraStatus').textContent=`Identificado: ${rule.name}`; return true;
}
function normalizeResidueName(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
}
const RESIDUE_ALIASES={
  botellaplastica:'Botella_plastica',plasticbottle:'Botella_plastica',plastics:'Botella_plastica',
  lata:'Lata',metalcan:'Lata',can:'Lata',
  papelcarton:'Papel_carton',papel:'Papel_carton',carton:'Papel_carton',paper:'Papel_carton',cardboard:'Papel_carton',
  organico:'Organico',residuoorganico:'Organico',organic:'Organico',foodwaste:'Organico',
  noaprovechable:'No_aprovechable',noreciclable:'No_aprovechable',nonrecyclable:'No_aprovechable',trash:'No_aprovechable',
  otro:'Otro',other:'Otro',unknown:'Otro'
};
function normalizeResiduePrediction(prediction){
  const candidates=(Array.isArray(prediction)?prediction:[prediction]).flatMap(candidate=>{
    if(!candidate||typeof candidate!=='object')return [];
    const label=candidate.className||candidate.class||candidate.label||candidate.name;
    const className=RESIDUE_ALIASES[normalizeResidueName(label)];
    const confidence=Number(candidate.confidence??candidate.probability);
    if(!className||!Number.isFinite(confidence)||confidence<0||confidence>1)return [];
    return [{className,confidence}];
  });
  return candidates.sort((a,b)=>b.confidence-a.confidence)[0]||null;
}
async function classifyWithGemini(base64){
  let response;
  try{
    response=await fetch('/api/gemini',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:base64})});
  }catch(error){
    throw new Error('No se pudo conectar con Gemini. Comprueba tu conexión e inicia la app con Vercel CLI o desde Vercel; Live Server no ejecuta /api.');
  }
  const data=await response.json().catch(()=>null);
  if(!response.ok){
    const message=data?.error||
      (response.status===404||response.status===405?'No está disponible /api/gemini. Live Server no ejecuta esta función; usa Vercel CLI o publica la app en Vercel.':`Gemini no pudo analizar la imagen (error ${response.status}).`);
    throw new Error(message);
  }
  if(!data||typeof data!=='object')throw new Error('Gemini devolvió una respuesta vacía o no válida.');
  return data;
}
let aiExampleDbPromise=null;
function openAiExampleDatabase(){
  if(aiExampleDbPromise)return aiExampleDbPromise;
  aiExampleDbPromise=new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){reject(new Error('Este navegador no permite guardar ejemplos de entrenamiento.'));return;}
    const request=indexedDB.open('ecopunto_ai_examples_v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('examples',{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(new Error(`No se pudo abrir el almacenamiento de ejemplos: ${request.error?.message||'error desconocido'}`));
  }).catch(error=>{aiExampleDbPromise=null;throw error;});
  return aiExampleDbPromise;
}
function getAiExamples(){
  return openAiExampleDatabase().then(database=>new Promise((resolve,reject)=>{
    const transaction=database.transaction('examples','readonly');
    const request=transaction.objectStore('examples').getAll();
    request.onsuccess=()=>{
      let legacy=[];
      try{
        const parsed=JSON.parse(localStorage.getItem('ecopunto_ai_examples_v1')||'[]');
        if(Array.isArray(parsed))legacy=parsed;
      }catch(error){console.warn('EcoPunto: no se pudieron leer los ejemplos anteriores.',error);}
      resolve([...legacy,...request.result]);
    };
    request.onerror=()=>reject(new Error(`No se pudieron leer los ejemplos: ${request.error?.message||'error desconocido'}`));
  }));
}
async function saveAiExample(example){
  const database=await openAiExampleDatabase();
  await new Promise((resolve,reject)=>{
    const transaction=database.transaction('examples','readwrite');
    transaction.objectStore('examples').add({...example,id:crypto.randomUUID(),createdAt:new Date().toISOString()});
    transaction.oncomplete=resolve;
    transaction.onerror=()=>reject(new Error(`No se pudo guardar el ejemplo: ${transaction.error?.message||'espacio local insuficiente'}`));
    transaction.onabort=()=>reject(new Error(`No se pudo guardar el ejemplo: ${transaction.error?.message||'espacio local insuficiente'}`));
  });
  refreshAiExampleCount();
}
async function refreshAiExampleCount(){
  const status=$('#aiTrainingCount');
  if(!status)return;
  try{
    const examples=await getAiExamples();
    status.textContent=`${examples.length} ejemplo(s) guardado(s) en este dispositivo.`;
  }catch(error){
    status.textContent=error.message;
    console.error('EcoPunto: no se pudo consultar el conjunto de entrenamiento.',error);
  }
}
const ZIP_CRC_TABLE=(()=>{
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){let value=n;for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;table[n]=value>>>0;}
  return table;
})();
function zipCrc32(bytes){
  let crc=0xffffffff;
  for(const byte of bytes)crc=ZIP_CRC_TABLE[(crc^byte)&0xff]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
function zipU16(view,offset,value){view.setUint16(offset,value,true);}
function zipU32(view,offset,value){view.setUint32(offset,value>>>0,true);}
async function exportAiExamples(){
  const button=$('#exportAiExamples');
  button.disabled=true;
  try{
    const examples=(await getAiExamples()).filter(example=>example.image&&RESIDUE_RULES[example.result?.className]);
    if(!examples.length)throw new Error('Aún no hay ejemplos de Gemini disponibles para descargar.');
    const encoder=new TextEncoder(),localParts=[],centralParts=[];
    let offset=0;
    const now=new Date(),dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(Math.floor(now.getSeconds()/2));
    const dosDate=((Math.max(1980,now.getFullYear())-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
    for(const [index,example] of examples.entries()){
      const dataUrl=example.image;
      const mime=dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,/i)?.[1];
      if(!mime)continue;
      const extension=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
      const className=example.result.className;
      const fileName=`${className}/${String(index+1).padStart(4,'0')}.${extension}`;
      const nameBytes=encoder.encode(fileName);
      const imageBytes=new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
      const crc=zipCrc32(imageBytes);
      const localHeader=new Uint8Array(30+nameBytes.length),localView=new DataView(localHeader.buffer);
      zipU32(localView,0,0x04034b50);zipU16(localView,4,20);zipU16(localView,6,0x0800);zipU16(localView,8,0);
      zipU16(localView,10,dosTime);zipU16(localView,12,dosDate);zipU32(localView,14,crc);
      zipU32(localView,18,imageBytes.length);zipU32(localView,22,imageBytes.length);zipU16(localView,26,nameBytes.length);
      localHeader.set(nameBytes,30);
      localParts.push(localHeader,imageBytes);
      const centralHeader=new Uint8Array(46+nameBytes.length),centralView=new DataView(centralHeader.buffer);
      zipU32(centralView,0,0x02014b50);zipU16(centralView,4,20);zipU16(centralView,6,20);zipU16(centralView,8,0x0800);zipU16(centralView,10,0);
      zipU16(centralView,12,dosTime);zipU16(centralView,14,dosDate);zipU32(centralView,16,crc);
      zipU32(centralView,20,imageBytes.length);zipU32(centralView,24,imageBytes.length);zipU16(centralView,28,nameBytes.length);
      zipU32(centralView,42,offset);centralHeader.set(nameBytes,46);
      centralParts.push(centralHeader);
      offset+=localHeader.length+imageBytes.length;
    }
    if(!centralParts.length)throw new Error('No se encontraron imágenes válidas para exportar.');
    const centralSize=centralParts.reduce((total,part)=>total+part.length,0);
    const endRecord=new Uint8Array(22),endView=new DataView(endRecord.buffer);
    zipU32(endView,0,0x06054b50);zipU16(endView,8,centralParts.length);zipU16(endView,10,centralParts.length);
    zipU32(endView,12,centralSize);zipU32(endView,16,offset);
    const archive=new Blob([...localParts,...centralParts,endRecord],{type:'application/zip'});
    const url=URL.createObjectURL(archive),link=document.createElement('a');
    link.href=url;link.download='ecopunto-ejemplos-teachable-machine.zip';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){
    console.error('EcoPunto: no se pudieron exportar los ejemplos de Gemini.',error);
    await showActionDialog(error.message,{title:'No se pudieron descargar los ejemplos'});
  }finally{button.disabled=false;}
}
$('#exportAiExamples')?.addEventListener('click',exportAiExamples);
refreshAiExampleCount();
let localTeachableMachine=null,localTeachableMachineLoading=null;
async function prepareLocalClassifier(){
  const status=$('#modelStatus');
  status.textContent='Comprobando el clasificador local para uso sin conexión…';
  try{
    await loadLocalTeachableMachine();
    status.textContent='Teachable Machine listo. El modelo quedó preparado para clasificar sin conexión.';
  }catch(error){
    console.info('EcoPunto: clasificador local no disponible.',error.message);
    status.textContent=`Clasificación offline: ${error.message}`;
  }
}
function loadLocalScript(src){
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector(`script[data-teachable-runtime="${src}"]`);
    if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error(`No se pudo cargar ${src}.`)),{once:true});if(existing.dataset.loaded==='true')resolve();return;}
    const script=document.createElement('script');script.src=src;script.async=true;script.dataset.teachableRuntime=src;
    script.onload=()=>{script.dataset.loaded='true';resolve();};
    script.onerror=()=>{script.remove();reject(new Error(`Falta el runtime local de Teachable Machine: ${src}`));};
    document.head.append(script);
  });
}
async function loadLocalTeachableMachine(){
  if(localTeachableMachine)return localTeachableMachine;
  if(localTeachableMachineLoading)return localTeachableMachineLoading;
  localTeachableMachineLoading=(async()=>{
    const assets=['./modelo/tf.min.js','./modelo/teachablemachine-image.min.js','./modelo/model.json','./modelo/metadata.json'];
    const configurationResponse=await fetch('./modelo/config.json');
    if(!configurationResponse.ok)throw new Error('No se encontró la configuración de Teachable Machine en modelo/config.json.');
    let configuration;
    try{configuration=await configurationResponse.json();}
    catch(error){throw new Error(`La configuración local de Teachable Machine no es JSON válido: ${error.message}`);}
    if(!configuration||typeof configuration!=='object'||Array.isArray(configuration)||typeof configuration.enabled!=='boolean'){
      throw new Error('La configuración de Teachable Machine debe incluir enabled con valor true o false.');
    }
    if(configuration.enabled!==true)throw new Error('Teachable Machine offline aún no está instalado. Agrega el modelo y runtime en modelo/, y activa enabled en modelo/config.json.');
    const checks=await Promise.all(assets.map(async url=>{
      try{return (await fetch(url,{cache:'no-store'})).ok;}catch{return false;}
    }));
    const missing=assets.filter((_,index)=>!checks[index]).map(url=>url.replace('./modelo/',''));
    if(missing.length)throw new Error(`Faltan estos archivos de Teachable Machine en modelo/: ${missing.join(', ')}.`);
    await loadLocalScript(assets[0]);
    await loadLocalScript(assets[1]);
    if(!window.tf||!window.tmImage?.load)throw new Error('TensorFlow.js o el runtime de Teachable Machine no se inició correctamente.');
    const model=await window.tmImage.load('./modelo/model.json','./modelo/metadata.json');
    if(typeof model.getClassLabels!=='function')throw new Error('El modelo no permite comprobar sus categorías. Expórtalo de nuevo como modelo de imágenes de Teachable Machine.');
    const labels=model.getClassLabels();
    const recognized=new Set((Array.isArray(labels)?labels:[]).map(label=>RESIDUE_ALIASES[normalizeResidueName(label)]).filter(Boolean));
    const missingClasses=Object.keys(RESIDUE_RULES).filter(className=>!recognized.has(className));
    if(missingClasses.length)throw new Error(`El modelo necesita estas categorías reconocibles: ${missingClasses.join(', ')}.`);
    localTeachableMachine={predict:video=>model.predict(video)};
    return localTeachableMachine;
  })();
  try{return await localTeachableMachineLoading;}
  finally{localTeachableMachineLoading=null;}
}
async function tryLocalTeachableMachine(){
  const runtime=await loadLocalTeachableMachine();
  const prediction=await runtime.predict($('#camera'));
  return normalizeResiduePrediction(prediction);
}
function awardPoints(result){
  const rule=RESIDUE_RULES[result.className];
  if(!current||(current.cloudAccount&&!rule))return;
  const points=rule?rule.points:Number(result.points||0);if(!points)return;
  const residue=rule?.name||result.name,bin=rule?.bin||result.bin;
  current.points+=points;current.scans+=1;current.history=current.history||[];
  current.history.push({at:new Date().toISOString(),residue,bin,points});
  const all=profiles(),idx=all.findIndex(p=>p.id===current.id); if(idx>=0)all[idx]=current; saveProfiles(all);
  if(current.cloudAccount){
    queueSync({eventId:crypto.randomUUID(),profileId:current.id,className:result.className});
    if(navigator.onLine)syncProfileQueue(current).catch(error=>{
      console.error('EcoPunto: escaneo guardado localmente, pero aún no sincronizado.',error);
      $('#accountSyncStatus').textContent=`Puntos pendientes de sincronizar: ${error.message}`;
    });
  }
  renderDashboard();
}
async function captureResidue(){
  const video=$('#camera');
  if(!video.videoWidth){await showActionDialog('La cámara todavía no está lista.');return;}
  const canvas=document.createElement('canvas');
  const scale=Math.min(1,1280/video.videoWidth);
  canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
  const context=canvas.getContext('2d');
  if(!context){await showActionDialog('No se pudo preparar la imagen de la cámara.');return}
  context.drawImage(video,0,0,canvas.width,canvas.height);
  const base64=canvas.toDataURL('image/jpeg',0.76);
  $('#scanResult').hidden=true; $('#cameraStatus').textContent='Analizando residuo…'; $('#capture').disabled=true;
  try{
    let classification=null,source=null,lastError='';
    if(navigator.onLine){
      try{
        const result=await classifyWithGemini(base64);
        classification=normalizeResiduePrediction(result);
        if(classification){
          const exampleResult={...RESIDUE_RULES[classification.className],...classification};
          saveAiExample({image:base64,result:exampleResult}).catch(error=>{
            console.error('EcoPunto: la clasificación funcionó, pero no se pudo guardar el ejemplo.',error);
            $('#aiTrainingCount').textContent=error.message;
          });
        }
        if(classification?.confidence>=0.75&&classification.className!=='Otro')source='Gemini';
      }catch(error){lastError=error.message;console.error('EcoPunto: falló la clasificación con Gemini.',error);}
    }
    if(!source){
      try{
        classification=await tryLocalTeachableMachine();
        if(classification?.confidence>=0.75&&classification.className!=='Otro')source='modelo local';
      }catch(error){lastError=error.message;console.warn('EcoPunto: el modelo local no está disponible.',error);}
    }
    if(source&&classification){
      const result={...classification,...RESIDUE_RULES[classification.className]};
      if(showScanResult(result,source)){
        awardPoints(result);
      }
    }else{
      const message=lastError||'No se identificó el residuo con suficiente confianza. No se asignaron puntos.';
      $('#cameraStatus').textContent=message;
      await showActionDialog(message,{title:'No se pudo identificar el residuo'});
    }
  }finally{$('#capture').disabled=false;}
}
function renderTeacher(){const all=profiles();const grouped={};all.forEach(p=>grouped[p.grade]=(grouped[p.grade]||0)+p.points);const rows=Object.entries(grouped).sort().map(([g,pts])=>`<tr><td>${g}</td><td>${pts}</td></tr>`).join('');$('#teacherTable').innerHTML=`<table class="teacher-table"><thead><tr><th>Grado</th><th>Puntos</th></tr></thead><tbody>${rows||'<tr><td colspan="2">Aún no hay datos.</td></tr>'}</tbody></table>`}

function queueSync(item){
  const q=JSON.parse(localStorage.getItem(SYNC_KEY)||'[]');
  q.push({...item,queuedAt:new Date().toISOString()});
  localStorage.setItem(SYNC_KEY,JSON.stringify(q));
}
async function syncProfileQueue(profile){
  if(profileSyncs.has(profile.id))return profileSyncs.get(profile.id);
  const task=(async()=>{
    if(!navigator.onLine)throw new Error('Sin conexión a internet.');
    if(!profile?.cloudAccount)return;
    const pending=JSON.parse(localStorage.getItem(SYNC_KEY)||'[]').filter(item=>item.profileId===profile.id);
    for(const item of pending){
      const result=await accountRequest('scan',{eventId:item.eventId,className:item.className},profile);
      profile.points=result.points;profile.scans=result.scans;
      saveCloudProfile(profile);
      const queue=JSON.parse(localStorage.getItem(SYNC_KEY)||'[]').filter(entry=>entry.eventId!==item.eventId);
      localStorage.setItem(SYNC_KEY,JSON.stringify(queue));
      if(current?.id===profile.id){
        current=profile;
        $('#pointsBadge').textContent=`⭐ ${profile.points}`;
        $('#totalPoints').textContent=profile.points;
        $('#totalScans').textContent=profile.scans;
      }
    }
    if(current?.id===profile.id)$('#accountSyncStatus').textContent='Cuenta online: todos los puntos están sincronizados.';
  })();
  profileSyncs.set(profile.id,task);
  try{return await task;}finally{profileSyncs.delete(profile.id);}
}
async function refreshCloudProfile(profile){
  if(!navigator.onLine||!profile?.cloudAccount)return profile;
  await syncProfileQueue(profile);
  const data=await accountRequest('profile',{},profile);
  const updated=localProfileFromCloud(data,profile);
  saveCloudProfile(updated);
  if(current?.id===updated.id){
    current=updated;
    const activeScreen=document.querySelector('.screen.active')?.id;
    if(activeScreen==='dashboard')renderDashboard();
    else if(activeScreen==='myProfile')renderMyProfile();
  }
  return updated;
}
async function syncWhenOnline(){
  const cloudProfiles=profiles().filter(profile=>profile.cloudAccount);
  for(const profile of cloudProfiles){
    try{
      await refreshCloudProfile(profile);
    }
    catch(error){console.error('EcoPunto: no se pudo sincronizar la cuenta.',error);if(current?.id===profile.id)$('#accountSyncStatus').textContent=`No se pudo actualizar la cuenta online; se conserva la copia de este dispositivo. ${error.message}`;}
  }
}
window.addEventListener('online',syncWhenOnline);
window.addEventListener('offline',()=>console.log('EcoPunto: modo sin conexión'));

window.addEventListener('beforeunload',()=>{if(stream)stream.getTracks().forEach(t=>t.stop())});
const saved=localStorage.getItem('ecopunto_current'); if(saved){const p=profiles().find(x=>x.id===saved);if(p)current=p}
updateHomeProfileButton();
if(current?.cloudAccount&&navigator.onLine){
  refreshCloudProfile(current).catch(error=>{
    console.error('EcoPunto: no se pudo cargar el perfil online.',error);
    if(document.querySelector('.screen.active')?.id==='dashboard'){
      $('#accountSyncStatus').textContent=`No se pudo actualizar el perfil online; se conserva la copia de este dispositivo. ${error.message}`;
    }
  });
}

let installPrompt=null;
const installAppButton=$('#installAppButton');
function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches||
    window.matchMedia('(display-mode: fullscreen)').matches||
    window.matchMedia('(display-mode: minimal-ui)').matches||
    window.navigator.standalone===true;
}
function updateInstallButton(){if(installAppButton)installAppButton.hidden=isStandalone();}
['standalone','fullscreen','minimal-ui'].forEach(mode=>{
  const query=window.matchMedia(`(display-mode: ${mode})`);
  query.addEventListener?.('change',updateInstallButton);
});
window.addEventListener('pageshow',updateInstallButton);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateInstallButton();});
function installContext(){
  const ua=navigator.userAgent||'';
  const ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const android=/Android/i.test(ua);
  const edge=/EdgA|EdgiOS|Edg\//.test(ua),opera=/OPR\/|OPT\/|Opera/.test(ua),samsung=/SamsungBrowser/i.test(ua);
  const inApp=/FBAN|FBAV|FB_IAB|Instagram|MicroMessenger|TikTok|musical_ly|Snapchat|Messenger|Telegram|Line\//i.test(ua)||(android&&/; wv\)/.test(ua))||/^android-app:\/\//.test(document.referrer||'');
  const chrome=/Chrome\/|CriOS\//.test(ua)&&!edge&&!opera&&!samsung;
  const safari=ios&&/Safari\//.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPT\/|GSA\//.test(ua);
  return {ios,android,inApp,chrome,safari};
}
async function installDiagnostics(){
  const mark=v=>v?'✓':'✗';
  let manifestOk=false,note='';
  try{
    const r=await fetch('manifest.json',{cache:'no-store'});
    manifestOk=r.ok&&/json/.test(r.headers.get('content-type')||'');
    if(!manifestOk)note=' (código '+r.status+')';
  }catch(e){note=' (sin respuesta)';}
  let sw=false;
  try{sw=!!(await navigator.serviceWorker.getRegistration());}
  catch(error){console.error('EcoPunto: no se pudo comprobar el service worker.',error);}
  return 'Diagnóstico: HTTPS '+mark(window.isSecureContext)+' · Manifest '+mark(manifestOk)+note+' · Service worker '+mark(sw)+' · Aviso de instalación del navegador '+mark(!!installPrompt);
}
async function showInstallHelp(){
  const help=$('#installHelp');if(!help)return;
  const c=installContext();let msg;
  if(isStandalone())msg='EcoPunto ya está instalada: la estás usando como aplicación.';
  else if(c.inApp)msg='Estás viendo la web dentro de otra aplicación (WhatsApp, Facebook, etc.) y desde ahí no se puede instalar. Toca ⋮ y elige “Abrir en Chrome” (o “Abrir en el navegador”) y desde Chrome toca otra vez este botón.';
  else if(c.ios)msg=c.safari?'En iPhone/iPad: toca el botón Compartir (cuadro con flecha hacia arriba) y elige “Añadir a pantalla de inicio”.':'En iPhone/iPad abre esta misma dirección en Safari, toca Compartir y elige “Añadir a pantalla de inicio”.';
  else if(c.android&&!c.chrome)msg='Para instalar en Android abre esta dirección en Google Chrome. Otros navegadores pueden no permitir la instalación.';
  else if(c.android)msg='Abre el menú ⋮ de Chrome y toca “Instalar aplicación” (o “Añadir a pantalla principal” y luego “Instalar”). Si no aparece: actualiza Chrome, borra los datos del sitio y vuelve a abrir esta dirección.';
  else msg='En computador usa el icono de instalar que aparece a la derecha de la barra de direcciones, o el menú ⋮ > Instalar EcoPunto.';
  help.hidden=false;help.textContent=msg;
  const diag=document.createElement('span');diag.className='install-diag';diag.textContent='Revisando…';help.appendChild(diag);
  diag.textContent=await installDiagnostics();
}
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  installPrompt=event;
});
installAppButton?.addEventListener('click',async()=>{
  if(!installPrompt){showInstallHelp();return;}
  await installPrompt.prompt();
  const choice=await installPrompt.userChoice;
  installPrompt=null;
  if(choice.outcome!=='accepted')showInstallHelp();
});
window.addEventListener('appinstalled',()=>{
  installPrompt=null;
  updateInstallButton();
  $('#installHelp').hidden=true;
});
updateInstallButton();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>{
    console.error('EcoPunto: no se pudo registrar el service worker.',error);
  }));
}


function updateConnectivityStatus(){
  const w=$('#wifiStatus'),g=$('#gamepadStatus');
  if(w){w.textContent=navigator.onLine?'📶 Wi‑Fi/Internet: conectado':'📵 Sin conexión';w.classList.toggle('connected',navigator.onLine);w.classList.toggle('offline',!navigator.onLine);}
  if(g){g.textContent=gamepadState?.connected?'🎮 Mando: conectado':'🎮 Mando: no conectado';g.classList.toggle('connected',!!gamepadState?.connected);}
}
window.addEventListener('online',updateConnectivityStatus);window.addEventListener('offline',updateConnectivityStatus);

/* =========================================================
   CONTROLES: TÁCTIL + TECLADO + MANDO XBOX
   El mando funciona de forma independiente del táctil.
   ========================================================= */
const gamepadState={index:null,connected:false,lastButtons:[],lastAxes:{x:0,y:0},lastMove:0,keyboard:false,choiceMenu:false};
let keyboardTarget=null,keyboardIndex=0,keyboardShift=false,choiceTarget=null,choiceIndex=0;
const keyboardRows=['1234567890','QWERTYUIOP','ASDFGHJKLÑ','ZXCVBNM','+-@._'];
const keyboardKeys=[];

function visibleFocusable(){
  const overlays=['#actionDialog','#teacherPasswordModal','#gamepadChoiceMenu'];
  const visibleOverlay=overlays.map(selector=>document.querySelector(selector)).find(el=>el&&!el.hidden);
  if(visibleOverlay){
    return [...visibleOverlay.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')]
      .filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';});
  }
  const active=document.querySelector('.screen.active');
  if(!active)return [];
  return [...active.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')]
    .filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0 && getComputedStyle(el).visibility!=='hidden';});
}
function focusFirst(){const items=visibleFocusable();if(items.length){items[0].focus({preventScroll:true});return items[0];}}
let lastFocusEl=null;
document.addEventListener('focusin',e=>{if(e.target.matches?.('button,input,select,textarea'))lastFocusEl=e.target;},true);
function setPasswordReveal(input,source,visible){
  if(!input?.matches('input[type="password"],input[data-password-input]'))return;
  input.dataset[`reveal${source}`]=visible?'true':'false';
  const revealed=input.dataset.revealPointer==='true'||input.dataset.revealKeyboard==='true'||input.dataset.revealGamepad==='true';
  input.type=revealed?'text':'password';
}
document.querySelectorAll('[data-password-toggle]').forEach(button=>{
  const input=document.getElementById(button.getAttribute('aria-controls'));
  if(!input)return;
  const stopReveal=()=>{setPasswordReveal(input,'Pointer',false);setPasswordReveal(input,'Keyboard',false);};
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    setPasswordReveal(input,'Pointer',true);
  });
  button.addEventListener('pointerup',stopReveal);
  button.addEventListener('pointercancel',stopReveal);
  button.addEventListener('lostpointercapture',stopReveal);
  button.addEventListener('keydown',event=>{
    if(event.key===' '||event.key==='Enter'){event.preventDefault();setPasswordReveal(input,'Keyboard',true);}
  });
  button.addEventListener('keyup',event=>{
    if(event.key===' '||event.key==='Enter')setPasswordReveal(input,'Keyboard',false);
  });
  button.addEventListener('blur',()=>setPasswordReveal(input,'Keyboard',false));
});
window.addEventListener('blur',()=>{
  document.querySelectorAll('input[data-password-input]').forEach(input=>{
    setPasswordReveal(input,'Pointer',false);
    setPasswordReveal(input,'Keyboard',false);
  });
});
function focusGamepadDirection(dx,dy){
  const items=visibleFocusable();if(!items.length)return;
  let current=document.activeElement;
  if(!items.includes(current)&&items.includes(lastFocusEl))current=lastFocusEl; // retoma donde estabas
  const now=performance.now();
  if(now-gamepadState.lastMove<170)return;
  gamepadState.lastMove=now;
  if(!items.includes(current)){focusFirst();return;}
  const r=current.getBoundingClientRect();
  const cx=r.left+r.width/2,cy=r.top+r.height/2;
  let best=null,bestScore=Infinity;
  for(const el of items){
    if(el===current)continue;
    const q=el.getBoundingClientRect(),x=q.left+q.width/2,y=q.top+q.height/2;
    const vx=x-cx,vy=y-cy;
    const primary=dx?vx*dx:vy*dy;
    const cross=dx?Math.abs(vy):Math.abs(vx);
    if(primary<=5)continue;
    const score=primary + cross*2;
    if(score<bestScore){bestScore=score;best=el;}
  }
  (best||items[(items.indexOf(current)+1)%items.length]).focus({preventScroll:false});
}
function focusField(delta){
  const fields=[...document.querySelectorAll('.screen.active input:not([type="hidden"]),.screen.active textarea')].filter(x=>x.offsetParent!==null);
  if(!fields.length)return;
  let i=fields.indexOf(document.activeElement);i=i<0?(delta>0?0:fields.length-1):(i+delta+fields.length)%fields.length;
  fields[i].focus();openVirtualKeyboard(fields[i]);
}
function updateKeyboardTarget(){const box=document.getElementById('gamepadKeyboardTarget');if(box)box.textContent=keyboardTarget?(keyboardTarget.type==='password'?'•'.repeat(keyboardTarget.value.length):keyboardTarget.value):'Selecciona un campo de texto';}
function setKeyboardTarget(el){if(!el||!('value' in el))return false;keyboardTarget=el;keyboardIndex=0;updateKeyboardTarget();selectKeyboardKey();return true;}
function buildVirtualKeyboard(){
  const wrap=document.getElementById('gamepadKeyboardKeys');if(!wrap)return;
  wrap.innerHTML='';keyboardKeys.length=0;
  keyboardRows.forEach(row=>row.split('').forEach(ch=>{const key=keyboardShift?ch.toUpperCase():ch.toLowerCase();addKey(key,key);}));
  addKey('Mayúscula','SHIFT');
  addKey('Espacio',' ');addKey('Borrar','BACKSPACE');addKey('Listo','ENTER');selectKeyboardKey();
}
function addKey(label,value){const b=document.createElement('button');b.type='button';b.className='gamepad-key'+(label.length>1?' wide':'');b.textContent=label;b.dataset.value=value;b.onclick=()=>pressVirtualKey(value);document.getElementById('gamepadKeyboardKeys').appendChild(b);keyboardKeys.push(b);}
function selectKeyboardKey(){keyboardKeys.forEach((b,i)=>b.classList.toggle('selected',i===keyboardIndex));keyboardKeys[keyboardIndex]?.scrollIntoView({block:'nearest',inline:'nearest'});}
function pressVirtualKey(value){
  if(!keyboardTarget)return;
  if(value==='SHIFT'){keyboardShift=!keyboardShift;buildVirtualKeyboard();return;}
  const target=keyboardTarget;
  if(value==='BACKSPACE')target.value=target.value.slice(0,-1);
  else if(value==='ENTER'){closeVirtualKeyboard();target.dispatchEvent(new Event('change',{bubbles:true}));if(target.id==='teacherPasswordInput')submitTeacherPassword();else target.focus({preventScroll:true});return;}
  else {target.value+=value;if(keyboardShift){keyboardShift=false;buildVirtualKeyboard();}}
  target.dispatchEvent(new Event('input',{bubbles:true}));updateKeyboardTarget();
}
function openVirtualKeyboard(el){if(!gamepadState.connected||!el||!('value' in el))return;keyboardShift=false;setKeyboardTarget(el);buildVirtualKeyboard();const panel=document.getElementById('gamepadKeyboard');if(panel)panel.hidden=false;gamepadState.keyboard=true;el.scrollIntoView({block:'center',behavior:'smooth'});}
function closeVirtualKeyboard(){const panel=document.getElementById('gamepadKeyboard');if(panel)panel.hidden=true;gamepadState.keyboard=false;keyboardTarget=null;keyboardShift=false;}
function openChoiceMenu(el){
  if(!gamepadState.connected||!el?.matches('select')||el.disabled)return;
  const options=[...el.options].filter(option=>option.value&&!option.disabled);
  if(!options.length)return;
  choiceTarget=el;choiceIndex=Math.max(0,options.findIndex(option=>option.value===el.value));
  renderChoiceMenu(options);
  document.getElementById('gamepadChoiceMenu').hidden=false;
  gamepadState.choiceMenu=true;
  el.scrollIntoView({block:'center',behavior:'smooth'});
}
function renderChoiceMenu(options){
  const title=document.getElementById('gamepadChoiceTitle'),list=document.getElementById('gamepadChoiceOptions');
  title.textContent=choiceTarget.id==='shift'?'Selecciona una jornada':'Selecciona tu grado';
  list.innerHTML='';
  options.forEach((option,index)=>{
    const button=document.createElement('button');button.type='button';button.className='gamepad-choice-option';button.textContent=option.textContent;button.classList.toggle('selected',index===choiceIndex);
    button.onclick=()=>chooseGamepadOption(index);list.appendChild(button);
  });
}
function moveChoiceOption(delta){
  if(!choiceTarget)return;
  const options=[...choiceTarget.options].filter(option=>option.value&&!option.disabled);
  choiceIndex=(choiceIndex+delta+options.length)%options.length;
  document.querySelectorAll('.gamepad-choice-option').forEach((button,index)=>button.classList.toggle('selected',index===choiceIndex));
  document.querySelector('.gamepad-choice-option.selected')?.scrollIntoView({block:'nearest'});
}
function chooseGamepadOption(index=choiceIndex){
  if(!choiceTarget)return;
  const target=choiceTarget,options=[...target.options].filter(option=>option.value&&!option.disabled),wasShift=target.id==='shift';
  if(!options[index])return;
  target.value=options[index].value;target.dispatchEvent(new Event('change',{bubbles:true}));
  closeChoiceMenu();
  if(wasShift){
    const grade=document.getElementById('grade');
    grade.focus({preventScroll:true});
    openChoiceMenu(grade);   // despliega automáticamente los grados de la jornada elegida
  }else document.getElementById('saveProfile')?.focus({preventScroll:false});
}
function closeChoiceMenu(){document.getElementById('gamepadChoiceMenu').hidden=true;gamepadState.choiceMenu=false;choiceTarget=null;}
function exitActiveField(){
  const active=document.activeElement;
  if(active?.matches('input:not([type="hidden"]),textarea,select')){active.blur();return true;}
  return false;
}
function moveVirtualKey(dx,dy){
  if(!keyboardKeys.length)return;
  const cols=10;
  if(dx<0)keyboardIndex=(keyboardIndex-1+keyboardKeys.length)%keyboardKeys.length;
  if(dx>0)keyboardIndex=(keyboardIndex+1)%keyboardKeys.length;
  if(dy<0)keyboardIndex=Math.max(0,keyboardIndex-cols);
  if(dy>0)keyboardIndex=Math.min(keyboardKeys.length-1,keyboardIndex+cols);
  selectKeyboardKey();
}
function activateGamepad(){
  if(!$('#actionDialog').hidden){const items=visibleFocusable();(items.includes(document.activeElement)?document.activeElement:focusFirst())?.click();return;}
  const pm=$('#teacherPasswordModal');
  if(pm&&!pm.hidden&&gamepadState.connected&&!gamepadState.keyboard){setKeyboardTarget($('#teacherPasswordInput'));buildVirtualKeyboard();openVirtualKeyboard($('#teacherPasswordInput'));return;}
  if(gamepadState.keyboard){pressVirtualKey(keyboardKeys[keyboardIndex]?.dataset.value||'');return;}
  if(gamepadState.choiceMenu){chooseGamepadOption();return;}
  const el=document.activeElement;
  if(el&&el.matches('input,textarea')){openVirtualKeyboard(el);return;}
  if(el&&el.matches('select')){openChoiceMenu(el);return;}
  if(el&&typeof el.click==='function')el.click();else focusFirst()?.click();
}
function passwordModalOpen(){const pm=$('#teacherPasswordModal');return !!pm&&!pm.hidden;}
function goBackFromGamepad(){
  if(!$('#actionDialog').hidden){closeActionDialog(false);return;}
  if(gamepadState.keyboard){const t=keyboardTarget;closeVirtualKeyboard();if(t&&t.id!=='teacherPasswordInput')t.focus({preventScroll:true});return;}
  if(gamepadState.choiceMenu){const t=choiceTarget;closeChoiceMenu();t?.focus({preventScroll:true});return;}
  if(passwordModalOpen()){closeTeacherPassword();return;}
  if(exitActiveField())return;
  const active=document.querySelector('.screen.active');if(!active)return;
  const back=active.querySelector('.back');if(back&&!back.disabled){back.click();return;}
  if(active.id==='profiles'||active.id==='register')go('home');
  else if(active.id==='scanner')go('dashboard');
  else if(active.id==='dashboard'||active.id==='teacher')go('home');
}
function setGamepad(pad){
  gamepadState.index=pad.index;gamepadState.connected=true;gamepadState.lastButtons=pad.buttons.map(b=>!!b.pressed);gamepadState.lastAxes={x:0,y:0};
  if(!document.activeElement||!visibleFocusable().includes(document.activeElement))focusFirst();
  document.body.classList.add('gamepad-active'); updateConnectivityStatus();
  const tp=$('#teacherPasswordInput'); if(tp&&$('#teacherPasswordModal')&&!$('#teacherPasswordModal').hidden){tp.readOnly=true;tp.setAttribute('inputmode','none');setKeyboardTarget(tp);buildVirtualKeyboard();}
}
function justPressed(pad,n){return !!pad.buttons[n]?.pressed&&!gamepadState.lastButtons[n];}
function pollGamepad(){
  const pads=navigator.getGamepads?navigator.getGamepads():[];
  let pad=gamepadState.index!==null?pads[gamepadState.index]:null;
  if(pad&&!pad.connected)pad=null;
  if(gamepadState.index!==null&&!pad)disconnectGamepad();
  if(!pad){pad=Array.from(pads).find(candidate=>candidate?.connected);if(pad)setGamepad(pad);}
  if(pad){
    const passwordTarget=gamepadState.keyboard?keyboardTarget:document.activeElement;
    const showingWithY=!!pad.buttons[3]?.pressed&&passwordTarget?.matches?.('input[type="password"],input[data-password-input]');
    document.querySelectorAll('input[data-password-input]').forEach(input=>{
      setPasswordReveal(input,'Gamepad',showingWithY&&input===passwordTarget);
    });
    const ax=Math.abs(pad.axes[0]||0)>.55?Math.sign(pad.axes[0]):0;
    const ay=Math.abs(pad.axes[1]||0)>.55?Math.sign(pad.axes[1]):0;
    const left=justPressed(pad,14)||ax<0&&gamepadState.lastAxes.x>=0;
    const right=justPressed(pad,15)||ax>0&&gamepadState.lastAxes.x<=0;
    const up=justPressed(pad,12)||ay<0&&gamepadState.lastAxes.y>=0;
    const down=justPressed(pad,13)||ay>0&&gamepadState.lastAxes.y<=0;
    if(gamepadState.keyboard){
      if(left)moveVirtualKey(-1,0);if(right)moveVirtualKey(1,0);if(up)moveVirtualKey(0,-1);if(down)moveVirtualKey(0,1);
      if(justPressed(pad,0))activateGamepad();       // A escribir/seleccionar
      if(justPressed(pad,1))goBackFromGamepad();    // B cerrar/volver
      if(justPressed(pad,2))pressVirtualKey(' ');    // X espacio
      if(justPressed(pad,3)&&!keyboardTarget?.matches?.('input[type="password"],input[data-password-input]'))pressVirtualKey('BACKSPACE'); // Y revela contraseñas; en otros campos borra
      if(justPressed(pad,6)||justPressed(pad,7))pressVirtualKey('BACKSPACE'); // LT/RT borrar
      if(justPressed(pad,4))focusField(-1);          // LB campo anterior
      if(justPressed(pad,5))focusField(1);           // RB campo siguiente
      if(justPressed(pad,8))closeVirtualKeyboard();  // View cerrar
      if(justPressed(pad,9))pressVirtualKey('ENTER');// Start listo
    }else if(gamepadState.choiceMenu){
      if(up||left)moveChoiceOption(-1);if(down||right)moveChoiceOption(1);
      if(justPressed(pad,0))activateGamepad();
      if(justPressed(pad,1))goBackFromGamepad();
    }else if(passwordModalOpen()){
      if(justPressed(pad,0))activateGamepad();        // A abre el teclado
      if(justPressed(pad,1))goBackFromGamepad();      // B cierra el cuadro
      if(justPressed(pad,9))submitTeacherPassword();  // Start entra
    }else{
      if(left)focusGamepadDirection(-1,0);if(right)focusGamepadDirection(1,0);if(up)focusGamepadDirection(0,-1);if(down)focusGamepadDirection(0,1);
      if(justPressed(pad,0))activateGamepad();       // A seleccionar
      if(justPressed(pad,1))goBackFromGamepad();     // B volver
      if(justPressed(pad,2)){const el=document.activeElement;if(el?.matches('input,textarea'))openVirtualKeyboard(el);}
      if(justPressed(pad,3)){const el=document.activeElement;if(el?.matches('input,textarea')&&!el.matches('input[data-password-input]'))openVirtualKeyboard(el);}
      if(justPressed(pad,4))focusField(-1);          // LB
      if(justPressed(pad,5))focusField(1);           // RB
      if(justPressed(pad,8))focusFirst();            // View
      if(justPressed(pad,9))activateGamepad();       // Start
    }
    gamepadState.lastButtons=pad.buttons.map(b=>!!b.pressed);gamepadState.lastAxes={x:ax,y:ay};
  }
  requestAnimationFrame(pollGamepad);
}
window.addEventListener('gamepadconnected',e=>{setGamepad(e.gamepad);});
function restoreTextInputs(){
  document.querySelectorAll('input,textarea').forEach(el=>{
    el.readOnly=false;
    if(el.id==='teacherPasswordInput')el.setAttribute('inputmode','numeric');else el.removeAttribute('inputmode');
  });
}
function disconnectGamepad(){
  gamepadState.index=null;gamepadState.connected=false;
  document.querySelectorAll('input[data-password-input]').forEach(input=>setPasswordReveal(input,'Gamepad',false));
  closeVirtualKeyboard();closeChoiceMenu();restoreTextInputs();
  const passwordModal=$('#teacherPasswordModal');
  if(passwordModal&&!passwordModal.hidden){
    passwordModal.classList.remove('using-gamepad');
    $('#teacherPasswordHint').textContent='Escribe la clave y pulsa Entrar.';
  }
  document.body.classList.remove('gamepad-active');
  updateConnectivityStatus();
}
window.addEventListener('gamepaddisconnected',e=>{if(e.gamepad.index===gamepadState.index)disconnectGamepad();});
document.getElementById('closeGamepadKeyboard')?.addEventListener('click',closeVirtualKeyboard);
document.getElementById('closeGamepadChoices')?.addEventListener('click',closeChoiceMenu);
document.addEventListener('keydown',e=>{
  // Atajos de teclado para PC y teclado físico
  if(e.target.matches('input,textarea,select')&&e.key!=='Escape')return;
  if(e.key==='Enter'||e.key===' '){e.preventDefault();document.activeElement?.click?.();}
  if(e.key==='Escape')goBackFromGamepad();
  if(e.key==='ArrowLeft')focusGamepadDirection(-1,0);
  if(e.key==='ArrowRight')focusGamepadDirection(1,0);
  if(e.key==='ArrowUp')focusGamepadDirection(0,-1);
  if(e.key==='ArrowDown')focusGamepadDirection(0,1);
});
buildVirtualKeyboard();
if('getGamepads' in navigator)requestAnimationFrame(pollGamepad);

document.addEventListener('focusin',e=>{
  if(!gamepadState.connected)return;
  if(e.target.matches('input[type="text"],input[type="password"],input:not([type]),textarea')){
    e.target.readOnly=true;e.target.setAttribute('inputmode','none');
  }
});
document.addEventListener('touchstart',e=>{
  const el=e.target.closest('input[type="text"],input[type="password"],input:not([type]),textarea');
  if(!el)return;
  if(!gamepadState.connected){
    el.readOnly=false;
    if(el.id==='teacherPasswordInput')el.setAttribute('inputmode','numeric');
    else if(el.getAttribute('inputmode')==='none')el.removeAttribute('inputmode');
    return;
  }
  el.readOnly=true;el.setAttribute('inputmode','none');e.preventDefault();openVirtualKeyboard(el);
},{passive:false});

updateConnectivityStatus();
