import { Component } from "react";

/**
 * Rede de segurança contra crashes.
 *
 * Sem isto, qualquer exceção não capturada em um useEffect ou render
 * derruba a árvore React inteira — tela preta, sem explicação, e se
 * estiver dentro da sala, o LiveKitRoom desmonta junto e desconecta
 * o usuário sem aviso. Este componente intercepta o erro e mostra
 * uma tela de recuperação em vez disso.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ShareRoom crash capturado:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Fronteira local (ex.: uma linha de participante): mostra um
    // substituto pequeno em vez da tela cheia de erro, para não
    // assustar por causa de uma falha isolada e pequena.
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="error-screen">
        <h2>⚠️ Algo deu errado</h2>
        <p>
          A sala travou por um erro inesperado. Isso não deveria ter
          acontecido — você pode tentar continuar ou recarregar a página.
        </p>
        <div className="error-actions">
          <button onClick={this.handleReset}>Tentar continuar</button>
          <button className="ghost" onClick={() => window.location.reload()}>
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
}
