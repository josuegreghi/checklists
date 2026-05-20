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

type ItemHistorico = {
  item: string
  status: string
  observacao: string | null
  foto: string | null
}

type ChecklistHistorico = {
  id: string
  operador_nome: string | null
  equipamento_nome: string | null
  observacao_geral: string | null
  created_at: string
  checklist_itens: ItemHistorico[]
}

export default function Home() {
  const [nome, setNome] = useState('')
  const [equipamento, setEquipamento] = useState('')
  const [observacao, setObservacao] = useState('')
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [observacoesItens, setObservacoesItens] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [historicoEquipamento, setHistoricoEquipamento] = useState<ChecklistHistorico[]>([])

  async function buscarHistoricoEquipamento(valor: string) {
    setEquipamento(valor)

    if (valor.length < 2) {
      setHistoricoEquipamento([])
      return
    }

    const { data, error } = await supabase
      .from('checklist')
      .select(`
        id,
        operador_nome,
        equipamento_nome,
        observacao_geral,
        created_at,
        checklist_itens (
          item,
          status,
          observacao,
          foto
        )
      `)
      .eq('equipamento_nome', valor)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!error && data) {
      setHistoricoEquipamento(data as ChecklistHistorico[])
    }
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
        observacao_geral: observacao
      })
      .select()
      .single()

    if (error) {
      alert('Erro ao salvar checklist')
      setSalvando(false)
      return
    }

    const itensSalvar = itens.map((item) => ({
      checklist_id: checklist.id,
      item,
      status: respostas[item] || 'OK',
      observacao: observacoesItens[item] || '',
      foto: ''
    }))

    await supabase.from('checklist_itens').insert(itensSalvar)

    alert('Checklist salvo com sucesso!')

    setNome('')
    setObservacao('')
    setRespostas({})
    setObservacoesItens({})
    setSalvando(false)

    buscarHistoricoEquipamento(equipamento)
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
          onChange={(e) => buscarHistoricoEquipamento(e.target.value)}
          placeholder="Exemplo: 14800"
        />

        {historicoEquipamento.length > 0 && (
          <div className="alerta">
            <h3>Últimos apontamentos do equipamento {equipamento}</h3>

            {historicoEquipamento.map((registro) => (
              <div className="registro" key={registro.id}>
                <strong>{new Date(registro.created_at).toLocaleString('pt-BR')}</strong>
                <p><b>Operador:</b> {registro.operador_nome}</p>
                <p><b>Observação geral:</b> {registro.observacao_geral || 'Sem observação'}</p>

                <h4>Itens apontados</h4>

                {registro.checklist_itens.map((item, index) => (
                  <div className="linha-item" key={index}>
                    <p><b>{item.item}</b></p>
                    <p>Status: {item.status}</p>
                    <p>Observação: {item.observacao || 'Sem observação'}</p>
                    {item.foto && (
                      <img src={item.foto} className="foto" alt="Foto do apontamento" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <label>Observação geral</label>
        <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} />

        <h3>Itens do Check-list</h3>

        {itens.map((item) => (
          <div className="item" key={item}>
            <strong>{item}</strong>

            <select
              value={respostas[item] || 'OK'}
              onChange={(e) => setRespostas({ ...respostas, [item]: e.target.value })}
            >
              <option>OK</option>
              <option>NÃO OK</option>
              <option>NÃO SE APLICA</option>
            </select>

            {(respostas[item] === 'NÃO OK') && (
              <>
                <label>Observação deste item</label>
                <textarea
                  value={observacoesItens[item] || ''}
                  onChange={(e) =>
                    setObservacoesItens({
                      ...observacoesItens,
                      [item]: e.target.value
                    })
                  }
                  placeholder="Descreva o problema encontrado"
                />
              </>
            )}
          </div>
        ))}

        <button onClick={salvarChecklist} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Finalizar Check-list'}
        </button>
      </section>
    </main>
  )
}
