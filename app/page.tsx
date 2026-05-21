'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import './style.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const gruposCaminhao = [
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
    descricao: 'Funcionamento das luzes externas e sinalização.',
    itens: [
      'Faróis',
      'Lanternas e luz de freio',
      'Setas',
      'Alarme de ré'
    ]
  },
  {
    titulo: '🛑 Freios e Segurança',
    descricao: 'Itens críticos para segurança da operação.',
    itens: ['Funcionamento do freio']
  }
]

const gruposEmpilhadeira = [
  {
    titulo: '🏗️ Estrutura e Garfos',
    descricao: 'Condição física da empilhadeira e dos garfos.',
    itens: [
      'Estado dos garfos',
      'Torre de elevação',
      'Correntes de elevação',
      'Protetor de carga'
    ]
  },
  {
    titulo: '⚙️ Sistema Hidráulico e Motor',
    descricao: 'Verificação de vazamentos, funcionamento e ruídos.',
    itens: [
      'Vazamento hidráulico',
      'Nível de óleo hidráulico',
      'Ruídos anormais',
      'Funcionamento geral'
    ]
  },
  {
    titulo: '🛑 Freios e Segurança',
    descricao: 'Itens de segurança do operador.',
    itens: [
      'Freio',
      'Freio de estacionamento',
      'Buzina',
      'Cinto de segurança',
      'Assento'
    ]
  },
  {
    titulo: '💡 Luzes, Painel e Bateria',
    descricao: 'Condições elétricas e sinalização.',
    itens: [
      'Luzes',
      'Painel',
      'Bateria',
      'Alarme de ré'
    ]
  },
  {
    titulo: '🛞 Rodas e Pneus',
    descricao: 'Estado dos pneus e rodas.',
    itens: [
      'Pneus',
      'Rodas'
    ]
  }
]

type Usuario = {
  id: string
  nome: string
  matricula: string
  perfil: string
  turno: string | null
}

type UltimoItem = {
  item: string
  status: string
  observacao: string | null
  foto: string | null
  foto_url: string | null
  checklist: {
    operador_nome: string | null
    equipamento_nome: string | null
    created_at: string
  } | null
}

export default function Home() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [erroLogin, setErroLogin] = useState('')

  const [tipoChecklist, setTipoChecklist] = useState('')
  const [equipamento, setEquipamento] = useState('')
  const [observacaoGeral, setObservacaoGeral] = useState('')
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [observacoes, setObservacoes] = useState<Record<string, string>>({})
  const [fotos, setFotos] = useState<Record<string, File | null>>({})
  const [ultimosItens, setUltimosItens] = useState<Record<string, UltimoItem>>({})
  const [salvando, setSalvando] = useState(false)
  const [passoAtual, setPassoAtual] = useState(0)

  const grupos =
    tipoChecklist === 'EMPILHADEIRA' ? gruposEmpilhadeira : gruposCaminhao

  const todosItens = grupos.flatMap((grupo) =>
    grupo.itens.map((item) => ({
      item,
      grupo: grupo.titulo,
      descricao: grupo.descricao
    }))
  )

  const itemAtual = todosItens[passoAtual]
  const totalItens = todosItens.length
  const progresso = Math.round(((passoAtual + 1) / totalItens) * 100)

  async function fazerLogin() {
    setErroLogin('')

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, matricula, perfil, turno, senha')
      .eq('matricula', matricula)
      .eq('senha', senha)
      .maybeSingle()

    if (error || !data) {
      setErroLogin('Matrícula ou senha inválida')
      return
    }

    setUsuario(data)
  }

  function sair() {
    setUsuario(null)
    setMatricula('')
    setSenha('')
    setTipoChecklist('')
    setEquipamento('')
    setPassoAtual(0)
  }

  async function buscarUltimoEquipamento(valor: string) {
    setEquipamento(valor)

    if (valor.length < 2 || !tipoChecklist) {
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
        checklist!inner (
          operador_nome,
          equipamento_nome,
          tipo_checklist,
          created_at
        )
      `)
      .eq('checklist.equipamento_nome', valor)
      .or(`tipo_checklist.eq.${tipoChecklist},tipo_checklist.is.null`, {
        foreignTable: 'checklist'
      })
    .order('created_at', {
        ascending: false,
        foreignTable: 'checklist'
      })
      .limit(300)

    if (error) {
      console.log('Erro ao buscar últimos itens:', error)
      return
    }

    const mapa: Record<string, UltimoItem> = {}

    if (data) {
      data.forEach((registro: any) => {
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
    if (!arquivo) return ''

    const extensao = arquivo.name.split('.').pop() || 'jpg'
    const itemLimpo = item
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase()

    const nomeArquivo = `${Date.now()}-${itemLimpo}.${extensao}`
    const caminho = `${checklistId}/${nomeArquivo}`

    const { data, error } = await supabase.storage
      .from('checklists')
      .upload(caminho, arquivo, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      alert('Erro ao enviar foto.')
      return ''
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from('checklists').getPublicUrl(data.path)

    return publicUrl
  }

  function validarItemAtual() {
    const item = itemAtual.item

    if (!respostas[item]) {
      alert(`Selecione o status do item: ${item}`)
      return false
    }

    if (respostas[item] === 'NÃO OK' && !observacoes[item]) {
      alert(`Descreva a observação do item NÃO OK: ${item}`)
      return false
    }

    return true
  }

  function proximoItem() {
    if (!validarItemAtual()) return

    if (passoAtual < totalItens - 1) {
      setPassoAtual(passoAtual + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function voltarItem() {
    if (passoAtual > 0) {
      setPassoAtual(passoAtual - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function salvarChecklist() {
    if (!usuario || !tipoChecklist || !equipamento) {
      alert('Preencha tipo de checklist e equipamento')
      return
    }

    if (!validarItemAtual()) return

    for (const obj of todosItens) {
      const item = obj.item

      if (!respostas[item]) {
        alert(`Falta preencher o item: ${item}`)
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
        operador_nome: usuario.nome,
        equipamento_nome: equipamento,
        tipo_checklist: tipoChecklist,
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

    for (const obj of todosItens) {
      const item = obj.item
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
      setSalvando(false)
      return
    }

    alert('Checklist salvo com sucesso!')

    setObservacaoGeral('')
    setRespostas({})
    setObservacoes({})
    setFotos({})
    setPassoAtual(0)
    setSalvando(false)

    buscarUltimoEquipamento(equipamento)
  }

  if (!usuario) {
    return (
      <main className="login-page">
        <section className="login-card">
          <h1>Check-list de Frota</h1>
          <p>Acesse com sua matrícula e senha</p>

          <label>Matrícula</label>
          <input
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            placeholder="Exemplo: admin"
          />

          <label>Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Digite sua senha"
          />

          {erroLogin && <p className="erro">{erroLogin}</p>}

          <button className="finalizar" onClick={fazerLogin}>
            Entrar
          </button>

          <p className="login-ajuda">
            Primeiro acesso: admin / 123456
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="container">
      <div className="topo topo-logado">
        <div>
          <h1>Check-list de Frota</h1>
          <p>Usuário: {usuario.nome}</p>
        </div>

        <button className="sair" onClick={sair}>
          Sair
        </button>
      </div>

      <section className="card dados">
        <h2>Dados do Check-list</h2>

        <label>Tipo de Check-list</label>
        <div className="tipo-grid">
          <button
            type="button"
            className={
              tipoChecklist === 'CAMINHAO'
                ? 'tipo-card ativo'
                : 'tipo-card'
            }
            onClick={() => {
              setTipoChecklist('CAMINHAO')
              setPassoAtual(0)
              setUltimosItens({})
            }}
          >
            🚛 Caminhão / Carreta
          </button>

          <button
            type="button"
            className={
              tipoChecklist === 'EMPILHADEIRA'
                ? 'tipo-card ativo'
                : 'tipo-card'
            }
            onClick={() => {
              setTipoChecklist('EMPILHADEIRA')
              setPassoAtual(0)
              setUltimosItens({})
            }}
          >
            🏗️ Empilhadeira
          </button>
        </div>

        <label>Equipamento / Placa</label>
        <input
          value={equipamento}
          onChange={(e) => buscarUltimoEquipamento(e.target.value)}
          placeholder="Exemplo: 14800"
          disabled={!tipoChecklist}
        />

        <label>Observação geral</label>
        <textarea
          value={observacaoGeral}
          onChange={(e) => setObservacaoGeral(e.target.value)}
          placeholder="Observação geral do checklist"
        />
      </section>

      {tipoChecklist && itemAtual && (
        <section className="card grupo">
          <div className="progresso-box">
            <div className="progresso-texto">
              <strong>
                Item {passoAtual + 1} de {totalItens}
              </strong>
              
              <span>
                {progresso}% concluído
              </span>
            </div>

            <div className="barra">
              <div
                className="barra-preenchida"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          <div className="grupo-header">
            <h2>{itemAtual.grupo}</h2>
            <p>{itemAtual.descricao}</p>
          </div>

          <div
            className={
              respostas[itemAtual.item] === 'NÃO OK'
                ? 'item item-nao-ok item-atual'
                : respostas[itemAtual.item] === 'OK'
                ? 'item item-ok item-atual'
                : respostas[itemAtual.item] === 'NÃO SE APLICA'
                ? 'item item-na item-atual'
                : 'item item-atual'
            }
          >
            <div className="item-titulo">
              <strong>{itemAtual.item}</strong>
            </div>

            {ultimosItens[itemAtual.item] && (
              <div
                className={
                  ultimosItens[itemAtual.item].status === 'NÃO OK'
                    ? 'ultimo-campo ultimo-nao-ok'
                    : 'ultimo-campo'
                }
              >
                <h3>Último apontamento deste item</h3>

                <p><b>Último status:</b> {ultimosItens[itemAtual.item].status}</p>
                <p><b>Última observação:</b> {ultimosItens[itemAtual.item].observacao || 'Sem observação'}</p>
                <p><b>Último operador:</b> {ultimosItens[itemAtual.item].checklist?.operador_nome || 'Não informado'}</p>
                <p>
                  <b>Última data/hora:</b>{' '}
                  {ultimosItens[itemAtual.item].checklist?.created_at
                    ? new Date(
                        new Date(
                          ultimosItens[itemAtual.item].checklist!.created_at
                        ).getTime() - 3 * 60 * 60 * 1000
                      ).toLocaleString('pt-BR')
                    : 'Não informado'}
                </p>

                {ultimosItens[itemAtual.item].foto_url && (
                  <img
                    src={`${ultimosItens[itemAtual.item].foto_url}?t=${Date.now()}`}
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
                  className={
                    respostas[itemAtual.item] === opcao ? 'opcao ativa' : 'opcao'
                  }
                  onClick={() =>
                    setRespostas({ ...respostas, [itemAtual.item]: opcao })
                  }
                >
                  {opcao === 'OK'
                    ? '✅ OK'
                    : opcao === 'NÃO OK'
                    ? '❌ NÃO OK'
                    : '➖ N/A'}
                </button>
              ))}
            </div>

            <label>Observação deste item</label>
            <textarea
              value={observacoes[itemAtual.item] || ''}
              onChange={(e) =>
                setObservacoes({
                  ...observacoes,
                  [itemAtual.item]: e.target.value
                })
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
                  [itemAtual.item]: e.target.files?.[0] || null
                })
              }
            />
          </div>

          <div className="navegacao">
            <button type="button" className="botao-secundario" onClick={voltarItem}>
              Voltar
            </button>

            {passoAtual < totalItens - 1 ? (
              <button type="button" className="botao-proximo" onClick={proximoItem}>
                Próximo item
              </button>
            ) : (
              <button className="botao-proximo" onClick={salvarChecklist} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Finalizar Check-list'}
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
