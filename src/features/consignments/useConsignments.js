import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export function useConsignments() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('consignments')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function create(payload) {
    const { data, error } = await supabase.from('consignments').insert(payload).select().single()
    if (error) throw error
    await load()
    return data
  }

  async function update(id, patch) {
    const { error } = await supabase.from('consignments').update(patch).eq('id', id)
    if (error) throw error
    await load()
  }

  return { rows, loading, error, reload: load, create, update }
}

// product types for the dropdown
export function useProductTypes() {
  const [types, setTypes] = useState([])
  useEffect(() => {
    supabase.from('product_types').select('*').order('sort_order')
      .then(({ data }) => setTypes(data || []))
  }, [])
  return types
}
