'use client'

import { useEffect, useState } from 'react'
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

type Checklist = {
  id: string
  observacao_geral: string | null
  created_at: string
}

export default function Home() {
  const [nome, setNome] = useState('')
  const [equipamento, setEquipamento] = useState('')
  const [observacao, setObservacao] = useState('')
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [historico, setHistorico] = useState<Checklist[]>([])

  async function carregarHistorico() {
    const { data, error } = await supabase
      .from('checklist')
      .select('id, observacao_geral, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error && data) {
      setHistorico(data)
    }
  }

  useEffect(() => {
    carregarHistorico()
  }, [])

  async function salvarChecklist() {
    if (!nome || !equipamento) {
      alert('Preencha nome e equipamento')
      return
    }

    setSalvando(true)

    const { data: checklist, error } = await supabase
      .from('checklist')
      .insert({
        observacao_geral: `Operador: ${nome} | Equipamento: ${equipamento} | ${observacao}`
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
      observacao: ''
    }))

    await supabase.from('checklist_itens').insert(itensSalvar)

    alert('Checklist salvo com sucesso!')
    setNome('')
    setEquipamento('')
    setObservacao('')
    setRespostas({})
    setSalvando(false)
    carregarHistorico()
  }

  return (
    <main className="container">
      <h1>Check-list de Frota</h1>

      <section className="card">
        <h2>Novo Check-list</h2>

        <label>Nome do operador</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} />

        <label>Equipamento / Placa</label>
        <input value={equipamento} onChange={(e) => setEquipamento(e.target.value)} />

        <label>Observação geral</label>
        <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} />

        <h3>Itens</h3>

        {itens.map((item) => (
          <div className="item" key={item}>
            <strong>{item}</strong>
            <select
              value={respostas[item] || 'OK'}
              onChange={(e) =>
                setRespostas({ ...respostas, [item]: e.target.value })
              }
            >
              <option>OK</option>
              <option>NÃO OK</option>
              <option>NÃO SE APLICA</option>
            </select>
          </div>
        ))}

        <button onClick={salvarChecklist} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Finalizar Check-list'}
        </button>
      </section>

      <section className="card historico">
        <div className="linha">
          <h2>Últimos Check-lists</h2>
          <button className="botao-menor" onClick={carregarHistorico}>
            Atualizar
          </button>
        </div>

        {historico.length === 0 && <p>Nenhum registro encontrado.</p>}

        {historico.map((registro) => (
          <div className="registro" key={registro.id}>
            <strong>
              {new Date(registro.created_at).toLocaleString('pt-BR')}
            </strong>
            <p>{registro.observacao_geral || 'Sem observação'}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
