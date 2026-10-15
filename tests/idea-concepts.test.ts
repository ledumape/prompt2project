import { describe, expect, it } from 'vitest';
import { extractIdeaConcepts } from '../lib/domain/idea-concepts';

describe('idea concept extraction', () => {
  it('surfaces distinct meaningful terms from English and Portuguese ideas', () => {
    expect(extractIdeaConcepts('A web app that matches volunteers to shifts and sends reminders.')).toEqual(['volunteers', 'shifts', 'reminders']);
    expect(extractIdeaConcepts('Um aplicativo para organizar turnos de voluntários e enviar lembretes.')).toEqual(['turnos', 'voluntários', 'lembretes']);
  });

  it('skips Portuguese request verbs and generic people words when selecting concepts', () => {
    expect(extractIdeaConcepts('Quero criar um aplicativo para organizar viagens em grupo. Quero que as pessoas possam sugerir lugares, votar nas opções e dividir os custos da viagem.'))
      .toEqual(['viagens', 'grupo', 'lugares']);
  });

  it('uses meaningful concepts from a family recipe idea instead of generic verbs', () => {
    expect(extractIdeaConcepts('Quero criar um site simples para guardar receitas antigas da minha família e as histórias de quem fazia cada uma. Quero que meus netos consigam achar uma receita pelo ingrediente.', 'Português'))
      .toEqual(['receitas', 'família', 'histórias']);
  });

  it('localizes the empty idea-map concepts', () => {
    expect(extractIdeaConcepts('', 'Português')).toEqual(['Problema', 'Pessoas', 'Escopo']);
    expect(extractIdeaConcepts('', 'English')).toEqual(['Problem', 'People', 'Scope']);
  });
});
