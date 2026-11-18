#!/usr/bin/env node
// Plantão do WhatsApp (Painel Zap), só os dois grupos do suporte Bling.
// A chave NÃO fica aqui: o proxy do ambiente da nuvem coloca o cabeçalho X-API-Key sozinho.
// Rodar com: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt NODE_NO_WARNINGS=1 node zap.mjs ...
// (sem NODE_USE_ENV_PROXY o Node não passa pelo proxy e a API responde 401).
// Linha (CORPORATIVO) e grupos são achados pelo nome na 1ª vez e guardados em ZAP_DADOS/config.json.
// Estado local (fora do Git): pasta ZAP_DADOS (padrão: ~/zap-dados).
//
// Uso:
//   node zap.mjs hist <loja|compras> [n]          últimas n mensagens (padrão 15)
//   node zap.mjs enviar <loja|compras> <arquivo.txt> [waIdCitado]
//   node zap.mjs vigia                             espera mensagem nova nos 2 grupos (até ~110 min)
//   node zap.mjs baixar <messageId>                salva a mídia em ZAP_DADOS/midia/<id>
// Regras: não marca como lido, não apaga, não agenda, não desconecta, não lê outras conversas.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const BASE = 'https://zap.focosaas.com.br/api/v1';
const DADOS = process.env.ZAP_DADOS || path.join(os.homedir(), 'zap-dados');
const CAB = { 'X-API-Key': 'proxy-injected' }; // o proxy troca pelo valor real
const PREFIXO = '🤖 *Agente Claude* – assistente da migração do Bling';
const NOME_LINHA = 'CORPORATIVO';
const NOMES = { loja: 'Bling atacadao', compras: 'Compras - suporte Ai' };

function falta(msg) { console.error(msg); process.exit(2); }
fs.mkdirSync(path.join(DADOS, 'midia'), { recursive: true });

// Linha e grupos: das variáveis, se houver; senão, achados pelo nome e guardados em ZAP_DADOS/config.json.
async function configurar() {
  const arq = path.join(DADOS, 'config.json');
  let c = fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8')) : {};
  c.inst = process.env.ZAP_INSTANCIA || c.inst;
  c.loja = process.env.ZAP_GRUPO_LOJA || c.loja;
  c.compras = process.env.ZAP_GRUPO_COMPRAS || c.compras;
  if (!c.inst) {
    const r = await api('/instances');
    c.inst = (r.corpo.data || []).find(i => i.name === NOME_LINHA)?.id;
    if (!c.inst) falta(`Linha ${NOME_LINHA} não encontrada (status ${r.status}).`);
  }
  for (const k of ['loja', 'compras']) {
    if (c[k]) continue;
    const r = await api(`/instances/${c.inst}/chats?search=${encodeURIComponent(NOMES[k])}&limit=5`);
    c[k] = (r.corpo.data || []).find(x => x.name === NOMES[k] && x.jid?.endsWith('@g.us'))?.jid;
    if (!c[k]) falta(`Grupo "${NOMES[k]}" não encontrado.`);
  }
  fs.writeFileSync(arq, JSON.stringify(c));
  return c;
}
let INST; const GRUPOS = {};

async function api(rota, opcoes = {}) {
  const r = await fetch(BASE + rota, { ...opcoes, headers: { ...CAB, ...(opcoes.headers || {}) } });
  const texto = await r.text();
  let corpo; try { corpo = JSON.parse(texto); } catch { corpo = texto; }
  return { status: r.status, corpo };
}

function grupoDoJid(jid) { return jid === GRUPOS.loja ? 'Bling atacadao' : jid === GRUPOS.compras ? 'Compras - suporte Ai' : null; }

function resumo(m, jid) {
  return JSON.stringify({
    grupo: grupoDoJid(jid || m.chat || m.chatJid), id: m.id, waId: m.waId,
    de: m.fromMe ? 'nós' : (m.from || m.senderName || m.pushName || m.participantName || m.participant || ''),
    api: !!m.fromMe, tipo: m.type, texto: m.text ?? m.body ?? m.caption ?? null,
    citando: m.replyTo?.waId || m.quoted?.waId || null,
    em: new Date(m.at || m.timestamp || Date.now()).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  });
}

async function hist(qual, n = 15) {
  const jid = GRUPOS[qual]; if (!jid) falta('grupo: loja ou compras');
  const r = await api(`/instances/${INST}/chats/${encodeURIComponent(jid)}/messages?limit=${n}`);
  if (r.status !== 200) falta(`erro ${r.status} ${JSON.stringify(r.corpo).slice(0, 300)}`);
  const lista = (r.corpo.data || r.corpo.messages || r.corpo).slice().reverse();
  for (const m of lista) console.log(resumo(m, jid));
}

async function enviar(qual, arquivo, citado) {
  const jid = GRUPOS[qual]; if (!jid) falta('grupo: loja ou compras');
  let texto = fs.readFileSync(arquivo, 'utf8').trim();
  if (!texto.startsWith(PREFIXO)) texto = `${PREFIXO}\n\n${texto}`;
  const corpo = { to: jid, type: 'text', text: texto };
  if (citado) corpo.quotedId = citado;
  const r = await api(`/instances/${INST}/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
  });
  console.log(r.status === 201 ? `201 enviado ${r.corpo.message?.waId || ''}` : `${r.status} ${JSON.stringify(r.corpo).slice(0, 300)}`);
}

async function vigia() {
  const arqCursor = path.join(DADOS, 'cursor.txt');
  let cursor = fs.existsSync(arqCursor) ? fs.readFileSync(arqCursor, 'utf8').trim() : '';
  const fim = Date.now() + 110 * 60 * 1000;
  while (Date.now() < fim) {
    const q = new URLSearchParams({ wait: '25', instanceId: INST, limit: '50' });
    if (cursor) q.set('since', cursor);
    let r;
    try { r = await api(`/inbox?${q}`); } catch (e) { await new Promise(s => setTimeout(s, 10000)); continue; }
    if (r.status !== 200) { console.error(`inbox ${r.status}`); await new Promise(s => setTimeout(s, 15000)); continue; }
    const primeira = !cursor;
    cursor = String(r.corpo.cursor ?? cursor);
    fs.writeFileSync(arqCursor, cursor);
    if (primeira) continue; // a 1ª chamada só marca o ponto de partida
    const nossas = (r.corpo.messages || []).filter(m => grupoDoJid(m.chat));
    if (nossas.length) { for (const m of nossas) console.log(resumo(m)); return; }
  }
  console.log('SEM_NOVIDADE');
}

async function baixar(id) {
  const r = await fetch(`${BASE}/media/${id}`, { headers: CAB });
  const tipo = r.headers.get('content-type') || '';
  const ext = tipo.includes('jpeg') ? '.jpg' : tipo.includes('png') ? '.png' : tipo.includes('pdf') ? '.pdf' : tipo.includes('ogg') ? '.ogg' : '';
  const destino = path.join(DADOS, 'midia', `${id}${ext}`);
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  console.log(`${r.status} ${tipo} ${destino}`);
}

const [cmd, a, b, c] = process.argv.slice(2);
{ const cfg = await configurar(); INST = cfg.inst; GRUPOS.loja = cfg.loja; GRUPOS.compras = cfg.compras; }
if (cmd === 'hist') await hist(a, Number(b) || 15);
else if (cmd === 'enviar') await enviar(a, b, c);
else if (cmd === 'vigia') await vigia();
else if (cmd === 'baixar') await baixar(a);
else falta('comandos: hist | enviar | vigia | baixar');
