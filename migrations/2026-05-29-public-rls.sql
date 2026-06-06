-- Migration pour autoriser l'accès public en lecture aux données du laboratoire (site public)

-- Produits et fiches de sécurité
CREATE POLICY "Allow public read access" ON public.products FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON public.safety_sheets FOR SELECT TO anon USING (true);

-- Matériels
CREATE POLICY "Allow public read access" ON public.materials FOR SELECT TO anon USING (true);

-- Sessions TP et ressources associées
CREATE POLICY "Allow public read access" ON public.tp_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON public.tp_reactifs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON public.tp_materials FOR SELECT TO anon USING (true);
