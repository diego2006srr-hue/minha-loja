import { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";

export default function AdminPanel() {
  const [pedidos, setPedidos] = useState([]);
  const [estoque, setEstoque] = useState({});

  useEffect(() => {
    carregarPedidos();
    carregarEstoque();
  }, []);

  async function carregarPedidos() {
    const querySnapshot = await getDocs(collection(db, "pedidos"));
    const lista = [];
    querySnapshot.forEach((docSnap) => {
      lista.push({ id: docSnap.id, ...docSnap.data() });
    });
    setPedidos(lista);
  }

  async function carregarEstoque() {
    const querySnapshot = await getDocs(collection(db, "estoque"));
    const lista = {};
    querySnapshot.forEach((docSnap) => {
      lista[docSnap.id] = docSnap.data().quantidade;
    });
    setEstoque(lista);
  }

  async function baixarEstoqueAutomatico(pedido) {
    if (!pedido.itens) return;

    for (const item of pedido.itens) {
      const estoqueRef = doc(db, "estoque", item.nome);
      const estoqueSnap = await getDoc(estoqueRef);

      if (estoqueSnap.exists()) {
        const quantidadeAtual = estoqueSnap.data().quantidade;
        const novaQuantidade = quantidadeAtual - item.quantidade;

        await updateDoc(estoqueRef, {
          quantidade: novaQuantidade < 0 ? 0 : novaQuantidade,
        });
      }
    }

    carregarEstoque();
  }

  async function atualizarStatus(pedido, novoStatus) {
    const pedidoRef = doc(db, "pedidos", pedido.id);

    await updateDoc(pedidoRef, { status: novoStatus });

    if (novoStatus === "Pagamento confirmado") {
      await baixarEstoqueAutomatico(pedido);
    }

    carregarPedidos();
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Painel Administrativo</h2>

      <h3>📦 Estoque Atual</h3>
      <ul>
        {Object.keys(estoque).map((item) => (
          <li key={item}>
            {item}: {estoque[item]} unidades
          </li>
        ))}
      </ul>

      <h3 style={{ marginTop: 20 }}>🧾 Pedidos</h3>
      {pedidos.map((pedido) => (
        <div
          key={pedido.id}
          style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}
        >
          <p><strong>Cliente:</strong> {pedido.nome}</p>
          <p><strong>Valor:</strong> R$ {pedido.total}</p>
          <p><strong>Status:</strong> {pedido.status}</p>

          <select
            value={pedido.status}
            onChange={(e) =>
              atualizarStatus(pedido, e.target.value)
            }
          >
            <option>Aguardando pagamento</option>
            <option>Pagamento confirmado</option>
            <option>Pedido em preparação</option>
            <option>Pedido enviado</option>
            <option>Pedido entregue</option>
          </select>
        </div>
      ))}
    </div>
  );
}
