'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import './style.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const grupos = [
  {
    titulo: '🚛 Cabine, Painel e Documentos',
    descricao: 'Condições internas, painel, segurança do operador e documentação.',
    itens: [
      'Limpeza interna do veículo',
      'Luz do painel',
      'Cinto de segurança',
      'Documentação',
      'Extintor'
    ]
  },
  {
    titulo: '⚙️ Motor e Vazamentos',
    descricao: 'Verificação básica do motor, níveis e possíveis vazamentos.',
    itens: [
      'Nível de água do radiador',
      'Nível de óleo do motor',
      'Ruídos anormais',
      'Vazamentos'
    ]
  },
  {
    titulo: '🛞 Rodas, Pneus e Fixação',
    descricao: 'Conferência dos pneus, calibragem e fixação das rodas.',
    itens: [
      'Calibragem dos pneus',
      'Estado dos pneus',
      'Aperto das porcas de rodas'
    ]
  },
  {
    titulo: '💡 Luzes e Sinalização',
    descricao: 'Funcionamento das luzes externas e sinalização do equipamento.',
    itens: [
      'Faróis',
      'Lanternas e luz de freio',
      'Setas',
      'Alarme de ré'
    ]
  },
  {
    titulo: '🛑 Freios e Segurança Operacional',
    descricao: 'Itens que impactam diretamente a segurança da operação.',
    itens: [
      'Funcionamento do freio'
    ]
  }
]

const todosItens = grupos.flatMap((grupo) => grupo.itens)

type UltimoItem = {
  item: string
  status: string
  observacao: string | null
  foto: string | null
  foto_url: string | null
  checklist: {
    operador_nome: string | null
    created_at: string
  } | null
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

    const { data, error } = await supabase
      .from('checklist_itens')
      .select(`
        item,
        status,
        observacao,
        foto,
        foto_url,
        checklist (
          operador_nome,
          equipamento_nome,
          created_at
        )
      `)
      .eq('checklist.equipamento_nome', valor)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.log('Erro ao buscar últimos itens:', error)
      return
    }

    const mapa: Record<string, UltimoItem> = {}

    if (data) {
      data.forEach((registro: any) => {
        if (!registro.checklist) return

        if (!mapa[registro.item]) {
          mapa[registro.item] = {
            ...registro,
            foto_url: registro.foto_url || registro.foto || ''
          }
        }
      })
    }

    setUltimosItens(mapa)
  }

  async function enviarFoto(item: string, checklistId: string) {
    const arquivo = fotos[item]

    if (!arquivo) {
      return ''
    }

    try {
      const extensao = arquivo.name.split('.').pop() || 'jpg'
      const itemLimpo = item
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '-')
        .toLowerCase()

      const nomeArquivo = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}-${itemLimpo}.${extensao}`

      const caminho = `${checklistId}/${nomeArquivo}`

      const { data, error } = await supabase.storage
        .from('checklists')
        .upload(caminho, arquivo, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        alert('Erro ao enviar foto.')
        console.log('ERRO STORAGE:', error)
        return ''
      }

      const {
        data: { publicUrl }
      } = supabase.storage.from('checklists').getPublicUrl(data.path)

      return publicUrl
    } catch (e) {
      console.log('ERRO GERAL FOTO:', e)
      return ''
    }
  }

  async function salvarChecklist() {
    if (!nome || !equipamento) {
      alert('Preencha nome e equipamento')
      return
    }

    for (const item of todosItens) {
      if (!respostas[item]) {
        alert(`Selecione o status do item: ${item}`)
        return
      }

      if (respostas[item] === 'NÃO OK' && !observacoes[item]) {
        alert(`Descreva a observação do item NÃO OK: ${item}`)
        return
      }
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
      console.log(error)
      setSalvando(false)
      return
    }

    const itensSalvar = []

    for (const item of todosItens) {
      const fotoUrl = await enviarFoto(item, checklist.id)

      itensSalvar.push({
        checklist_id: checklist.id,
        item,
        status: respostas[item],
        observacao: observacoes[item] || '',
        foto: fotoUrl,
        foto_url: fotoUrl
      })
    }

    const { error: erroItens } = await supabase
      .from('checklist_itens')
      .insert(itensSalvar)

    if (erroItens) {
      alert('Erro ao salvar itens do checklist')
      console.log(erroItens)
      setSalvando(false)
      return
    }

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
      <div className="topo">
        <div>
          <h1>Check-list de Frota</h1>
          <p>Inspeção operacional com histórico por equipamento</p>
        </div>
      </div>

      <section className="card dados">
        <h2>Dados do Check-list</h2>

        <div className="grid">
          <div>
            <label>Nome do operador</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome"
            />
          </div>

          <div>
            <label>Equipamento / Placa</label>
            <input
              value={equipamento}
              onChange={(e) => buscarUltimoEquipamento(e.target.value)}
              placeholder="Exemplo: 14800"
            />
          </div>
        </div>

        <label>Observação geral</label>
        <textarea
          value={observacaoGeral}
          onChange={(e) => setObservacaoGeral(e.target.value)}
          placeholder="Observação geral do checklist"
        />
      </section>

      {grupos.map((grupo) => (
        <section className="card grupo" key={grupo.titulo}>
          <div className="grupo-header">
            <div>
              <h2>{grupo.titulo}</h2>
              <p>{grupo.descricao}</p>
            </div>
          </div>

          {grupo.itens.map((item) => (
            <div
              className={
                respostas[item] === 'NÃO OK'
                  ? 'item item-nao-ok'
                  : respostas[item] === 'OK'
                  ? 'item item-ok'
                  : respostas[item] === 'NÃO SE APLICA'
                  ? 'item item-na'
                  : 'item'
              }
              key={item}
            >
              <div className="item-titulo">
                <strong>{item}</strong>
                {respostas[item] === 'NÃO OK' && <span>⚠️ Atenção</span>}
                {respostas[item] === 'OK' && <span>✅ OK</span>}
                {respostas[item] === 'NÃO SE APLICA' && <span>➖ N/A</span>}
              </div>

              {ultimosItens[item] && (
                <div
                  className={
                    ultimosItens[item].status === 'NÃO OK'
                      ? 'ultimo-campo ultimo-nao-ok'
                      : 'ultimo-campo'
                  }
                >
                  <p><b>Último status:</b> {ultimosItens[item].status}</p>
                  <p><b>Última observação:</b> {ultimosItens[item].observacao || 'Sem observação'}</p>
                  <p><b>Último operador:</b> {ultimosItens[item].checklist?.operador_nome || 'Não informado'}</p>
                  <p>
                    <b>Última data/hora:</b>{' '}
                    {ultimosItens[item].checklist?.created_at
                      ? new Date(ultimosItens[item].checklist!.created_at).toLocaleString('pt-BR')
                      : 'Não informado'}
                  </p>

                  {ultimosItens[item].foto_url && (
                    <img
                      src={`${ultimosItens[item].foto_url}?t=${Date.now()}`}
                      className="foto"
                      alt="Foto anterior"
                    />
                  )}
                </div>
              )}

              <div className="opcoes">
                {['OK', 'NÃO OK', 'NÃO SE APLICA'].map((opcao) => (
                  <button
                    type="button"
                    key={opcao}
                    className={respostas[item] === opcao ? 'opcao ativa' : 'opcao'}
                    onClick={() =>
                      setRespostas({ ...respostas, [item]: opcao })
                    }
                  >
                    {opcao === 'OK' ? '✅ OK' : opcao === 'NÃO OK' ? '❌ NÃO OK' : '➖ N/A'}
                  </button>
                ))}
              </div>

              <label>Observação deste item</label>
              <textarea
                value={observacoes[item] || ''}
                onChange={(e) =>
                  setObservacoes({ ...observacoes, [item]: e.target.value })
                }
                placeholder="Descreva se houver alguma condição encontrada"
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
        </section>
      ))}

      <button className="finalizar" onClick={salvarChecklist} disabled={salvando}>
        {salvando ? 'Salvando...' : 'Finalizar Check-list'}
      </button>
    </main>
  )
}
