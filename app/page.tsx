'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import './style.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const itens = [
  'Limpeza interna do veículo',
  'Nível de água do radiador',
  'Nível de óleo do motor',
  'Luz do painel',
  'Ruídos anormais',
  'Vazamentos',
  'Funcionamento do freio',
  'Calibragem dos pneus',
  'Estado dos pneus',
  'Faróis',
  'Lanternas e luz de freio',
  'Setas',
  'Alarme de ré',
  'Extintor',
  'Cinto de segurança',
  'Documentação'
]

type UltimoItem = {
  item: string
  status: string
  observacao: string | null
  foto: string | null
  foto_url: string | null
}

export default function Home() {
  const [nome, setNome] = useState('')
  const [equipamento, setEquipamento] = useState('')
  const [observacaoGeral, setObservacaoGeral] = useState('')
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [observacoes, setObservacoes] = useState<Record<string, string>>({})
  const [fotos, setFotos] = useState<Record<string, File | null>>({})
  const [ultimosItens, setUltimosItens] = useState<Record<string, UltimoItem>>({})
  const [salvando, setSalvando] = useState(false)

  async function buscarUltimoEquipamento(valor: string) {
    setEquipamento(valor)

    if (valor.length < 2) {
      setUltimosItens({})
      return
    }

    const { data } = await supabase
      .from('checklist')
      .select(`
        id,
        created_at,
        checklist_itens (
          item,
          status,
          observacao,
          foto,
          foto_url
        )
      `)
      .eq('equipamento_nome', valor)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const mapa: Record<string, UltimoItem> = {}

    if (data?.checklist_itens) {
      data.checklist_itens.forEach((i: UltimoItem) => {
        mapa[i.item] = {
          ...i,
          foto_url: i.foto_url || i.foto || ''
        }
      })
    }

    setUltimosItens(mapa)
  }

  async function enviarFoto(item: string, checklistId: string) {
    const arquivo = fotos[item]
    if (!arquivo) return ''

    const caminho = `checklists/${checklistId}/${Date.now()}-${arquivo.name}`

    const { error } = await supabase.storage
      .from('checklists')
      .upload(caminho, arquivo)

    if (error) {
      console.log('Erro ao enviar foto:', error)
      return ''
    }

    const { data } = supabase.storage
      .from('checklists')
      .getPublicUrl(caminho)

    return data.publicUrl
  }

  async function salvarChecklist() {
    if (!nome || !equipamento) {
      alert('Preencha nome e equipamento')
      return
    }

    setSalvando(true)

    const { data: checklist, error } = await supabase
      .from('checklist')
      .insert({
        operador_nome: nome,
        equipamento_nome: equipamento,
        observacao_geral: observacaoGeral
      })
      .select()
      .single()

    if (error || !checklist) {
      alert('Erro ao salvar checklist')
      setSalvando(false)
      return
    }

    const itensSalvar = []

    for (const item of itens) {
      const fotoUrl = await enviarFoto(item, checklist.id)

      itensSalvar.push({
        checklist_id: checklist.id,
        item,
        status: respostas[item] || 'OK',
        observacao: observacoes[item] || '',
        foto: fotoUrl,
        foto_url: fotoUrl
      })
    }

    await supabase.from('checklist_itens').insert(itensSalvar)

    alert('Checklist salvo com sucesso!')

    setObservacaoGeral('')
    setRespostas({})
    setObservacoes({})
    setFotos({})
    setSalvando(false)

    buscarUltimoEquipamento(equipamento)
  }

  return (
    <main className="container">
      <h1>Check-list de Frota</h1>

      <section className="card">
        <h2>Novo Check-list</h2>

        <label>Nome do operador</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} />

        <label>Equipamento / Placa</label>
        <input
          value={equipamento}
          onChange={(e) => buscarUltimoEquipamento(e.target.value)}
          placeholder="Exemplo: 14800"
        />

        <label>Observação geral</label>
        <textarea
          value={observacaoGeral}
          onChange={(e) => setObservacaoGeral(e.target.value)}
        />

        <h3>Itens do Check-list</h3>

        {itens.map((item) => (
          <div
            className={
              respostas[item] === 'NÃO OK'
                ? 'item item-nao-ok'
                : respostas[item] === 'OK' || !respostas[item]
                ? 'item item-ok'
                : 'item'
            }
            key={item}
          >
            <strong>{item}</strong>

            {ultimosItens[item] && (
              <div
                className={
                  ultimosItens[item].status === 'NÃO OK'
                    ? 'ultimo-campo ultimo-nao-ok'
                    : 'ultimo-campo'
                }
              >
                <p>
                  <b>Último status:</b> {ultimosItens[item].status}
                </p>

                <p>
                  <b>Última observação:</b>{' '}
                  {ultimosItens[item].observacao || 'Sem observação'}
                </p>

                {ultimosItens[item].foto_url && (
                  <img
                    src={ultimosItens[item].foto_url}
                    className="foto"
                    alt="Foto anterior"
                  />
                )}
              </div>
            )}

            <select
              className={
                respostas[item] === 'NÃO OK'
                  ? 'select-nao-ok'
                  : respostas[item] === 'OK' || !respostas[item]
                  ? 'select-ok'
                  : ''
              }
              value={respostas[item] || 'OK'}
              onChange={(e) =>
                setRespostas({ ...respostas, [item]: e.target.value })
              }
            >
              <option>OK</option>
              <option>NÃO OK</option>
              <option>NÃO SE APLICA</option>
            </select>

            <label>Observação deste item</label>
            <textarea
              value={observacoes[item] || ''}
              onChange={(e) =>
                setObservacoes({ ...observacoes, [item]: e.target.value })
              }
              placeholder="Digite uma observação se necessário"
            />

            <label>Foto deste item</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) =>
                setFotos({
                  ...fotos,
                  [item]: e.target.files?.[0] || null
                })
              }
            />
          </div>
        ))}

        <button onClick={salvarChecklist} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Finalizar Check-list'}
        </button>
      </section>
    </main>
  )
}
